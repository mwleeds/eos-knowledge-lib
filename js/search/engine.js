// Copyright 2014 Endless Mobile, Inc.
const ByteArray = imports.byteArray;
const EosShard = imports.gi.EosShard;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Lang = imports.lang;
const Soup = imports.gi.Soup;

const ArticleObjectModel = imports.search.articleObjectModel;
const AsyncTask = imports.search.asyncTask;
const ContentObjectModel = imports.search.contentObjectModel;
const MediaObjectModel = imports.search.mediaObjectModel;
const QueryObject = imports.search.queryObject;
const datadir = imports.search.datadir;
const Utils = imports.search.utils;

GObject.ParamFlags.READWRITE = GObject.ParamFlags.READABLE | GObject.ParamFlags.WRITABLE;

/**
 * Class: Engine
 *
 * Engine represents the connection to the Knowledge Engine's API. It exposes
 * that API through two methods, <get_object_by_id> and <get_objects_by_query>.
 */
const Engine = Lang.Class({
    Name: 'Engine',
    GTypeName: 'EknEngine',
    Extends: GObject.Object,

    Properties: {
        /**
         * Property: host
         *
         * The hostname of the xapian bridge. You generally don't
         * need to set this.
         *
         * Defaults to '127.0.0.1'
         * FIXME: the default should just be localhost, but libsoup has a bug
         * whereby it does not resolve localhost when it is offline:
         * https://bugzilla.gnome.org/show_bug.cgi?id=692291
         * Once this bug is fixed, we should change this to be localhost.
         */
        'host': GObject.ParamSpec.string('host',
            'Knowledge Engine Hostname', 'HTTP hostname for the Knowledge Engine service',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT,
            '127.0.0.1'),

        /**
         * Property: port
         *
         * The port of the xapian bridge. You generally don't need
         * to set this.
         *
         * Defaults to 3004
         */
        'port': GObject.ParamSpec.int('port', 'Knowledge Engine Port',
            'The port of the Knowledge Engine service',
             GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT,
             -1, GLib.MAXINT32, 3004),

        /**
         * Property: default-domain
         *
         * The domain to use to find content in case none is explicitly
         * passed into the query.
         *
         * e.g. animals-es
         */
        'default-domain': GObject.ParamSpec.string('default-domain',
            'Default Domain', 'The default domain to use for queries',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT,
            ''),

        /**
         * Property: language
         *
         * The ISO639 language code which will be used for various search
         * features, such as term stemming and spelling correction.
         *
         * Defaults to empty string
         */
        'language': GObject.ParamSpec.string('language',
            'Language', 'ISO639 locale code to be used in search',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT,
            ''),

    },

    _DB_DIR: 'db',
    _MEDIA_DIR: 'media',

    _init: function (params) {
        this.parent(params);
        this._http_session = new Soup.Session();

        // Caches domain => content path so that we don't have to hit the
        // disk on every object lookup.
        this._content_path_cache = {};

        // Like _content_path_cache, but for EKN_VERSION files
        this._ekn_version_cache = {};

        this._shard_file_cache = {};
    },

    /**
     * Function: get_object_by_id
     *
     * Asynchronously fetches an object with ID.
     *
     * Parameters:
     *   id - The unique ID for this object, of the form ekn://domain/sha
     *   cancellable - A Gio.Cancellable to cancel the async request.
     *   callback - A function which will be called after the request finished.
     *              The function will be called with the engine and a task object,
     *              as parameters. The task object can be used with
     *              <get_object_by_id_finish> to retrieve the result.
     */
    get_object_by_id: function (id, cancellable, callback) {
        let task = new AsyncTask.AsyncTask(this, cancellable, callback);
        task.catch_errors(() => {
            let handle_redirect = (result) => {
                let model = this._model_from_json_ld(result);

                // If the requested model should redirect to another, then fetch
                // that model instead.
                if (model.redirects_to.length > 0) {
                    this.get_object_by_id(model.redirects_to, cancellable, task.catch_callback_errors((engine, redirect_task) => {
                        task.return_value(this.get_object_by_id_finish(redirect_task));
                    }));
                } else {
                    task.return_value(model);
                }
            };

            let [domain, hash] = Utils.components_from_ekn_id(id);
            let ekn_version = this._ekn_version_from_domain(domain);

            // Bundles with version >= 2 store all json-ld on disk instead of in the
            // Xapian DB itself, and hence require no HTTP request to xapian-bridge
            // when fetching an object
            if (ekn_version >= 2) {
                let shard_file = this._shard_file_from_domain(domain);
                let record = shard_file.find_record_by_hex_name(hash);
                if (!record)
                    throw new Error('Could not find epak record for ' + id);

                let metadata_stream = record.metadata.get_stream();
                Utils.read_stream(metadata_stream, cancellable, task.catch_callback_errors((stream, stream_task) => {
                    let data = Utils.read_stream_finish(stream_task);
                    handle_redirect(JSON.parse(data));
                }));
            } else {
                // Older bundles require an HTTP request for every object request
                let query_obj = new QueryObject.QueryObject({
                    limit: 1,
                    ids: [id],
                    domain: domain,
                });
                let req_uri = this._get_xapian_uri(query_obj);

                this._send_json_ld_request(req_uri, cancellable, task.catch_callback_errors((engine, json_task) => {
                    let json_ld = this._send_json_ld_request_finish(json_task);
                    handle_redirect(json_ld.results.map(JSON.parse)[0]);
                }));
            }
        });
        return task;
    },

    /**
     * Function: get_object_by_id_finish
     *
     * Finishes a call to <get_object_by_id>. Returns the <ContentObjectModel>
     * associated with the id requested, or throws an error if one occurred.
     *
     * Parameters:
     *   task - The task returned by <get_object_by_id>
     */
    get_object_by_id_finish: function (task) {
        return task.finish();
    },

    /**
     * Function: get_objects_by_query
     *
     * Asynchronously sends a request for to xapian-bridge for a given
     * *query_obj*, and return a list of matching models.
     *
     * Parameters:
     *   query_obj - A <QueryObject> describing the query.
     *   cancellable - A Gio.Cancellable to cancel the async request.
     *   callback - A function which will be called after the request finished.
     *              The function will be called with the engine and a task object,
     *              as parameters. The task object can be used with
     *              <get_objects_by_query_finish> to retrieve the result.
     */
    get_objects_by_query: function (query_obj, cancellable, callback) {
        let task = new AsyncTask.AsyncTask(this, cancellable, callback);
        task.catch_errors(() => {
            if (query_obj.domain === '')
                query_obj = QueryObject.QueryObject.new_from_object(query_obj, { domain: this.default_domain });
            let req_uri = this._get_xapian_uri(query_obj);

            this._send_json_ld_request(req_uri, cancellable, task.catch_callback_errors((engine, json_task) => {
                let json_ld = this._send_json_ld_request_finish(json_task);

                if (json_ld.results.length === 0) {
                    task.return_value([[], null]);
                    return;
                }

                let more_results_query = QueryObject.QueryObject.new_from_object(query_obj, {
                    offset: json_ld.numResults + json_ld.offset,
                });

                // We need to instantiate models for our results asynchronously.
                // We'll set up a function here to resolve a result, which
                // triggers our callback when the last article resolves.
                let resolved = 0;
                let results = new Array(json_ld.results.length);
                let resolve = (index, model) => {
                    results[index] = model;
                    resolved++;
                    if (resolved === results.length)
                        task.return_value([results, more_results_query]);
                };

                json_ld.results.forEach((result, index) => {
                    let id;
                    let ekn_version = this._ekn_version_from_domain(query_obj.domain);
                    if (ekn_version >= 2) {
                        id = result;
                    } else {
                        // Old bundles contain all the jsonld in xapian, and
                        // serve it in the results. If its a redirect we need to
                        // resolve it, otherwise we can resolve immediately.
                        let model = this._model_from_json_ld(JSON.parse(result));
                        if (model.redirects_to.length > 0) {
                            id = model.redirects_to;
                        } else {
                            resolve(index, model);
                            return;
                        }
                    }
                    this.get_object_by_id(id, cancellable, task.catch_callback_errors((engine, id_task) => {
                        let model = this.get_object_by_id_finish(id_task);
                        resolve(index, model);
                    }));
                });
            }));
        });
        return task;
    },

    /**
     * Function: get_objects_by_query_finish
     *
     * Finishes a call to <get_objects_by_query>. Returns both a list of
     * <ContentObjectModels> and <QueryObject> which can be used to get more
     * results for the same query. Throws an error if one occurred.
     *
     * Parameters:
     *   task - The task returned by <get_objects_by_query>
     */
    get_objects_by_query_finish: function (task) {
        return task.finish();
    },

    _content_path_from_domain: function (domain) {
        if (this._content_path_cache[domain] === undefined)
            this._content_path_cache[domain] = datadir.get_data_dir_for_domain(domain).get_path();

        return this._content_path_cache[domain];
    },

    _ekn_version_from_domain: function (domain) {
        if (this._ekn_version_cache[domain] === undefined)
            this._ekn_version_cache[domain] = Utils.get_ekn_version_for_domain(domain);

        return this._ekn_version_cache[domain];
    },

    _shard_path_from_domain: function (domain) {
        let content_path = this._content_path_from_domain(domain);

        let path_components = [content_path, 'media.shard'];
        let filename = GLib.build_filenamev(path_components);
        return filename;
    },

    _shard_file_from_domain: function (domain) {
        if (this._shard_file_cache[domain] === undefined) {
            let shard_file = new EosShard.ShardFile({
                path: this._shard_path_from_domain(domain),
            });
            shard_file.init(null);
            this._shard_file_cache[domain] = shard_file;
        }

        return this._shard_file_cache[domain];
    },

    // Returns a marshaled ObjectModel based on json_ld's @type value, or throws
    // error if there is no corresponding model
    _model_from_json_ld: function (json_ld) {
        let ekn_model_by_ekv_type = {
            'ekn://_vocab/ContentObject':
                ContentObjectModel.ContentObjectModel,
            'ekn://_vocab/ArticleObject':
                ArticleObjectModel.ArticleObjectModel,
            'ekn://_vocab/ImageObject':
                MediaObjectModel.ImageObjectModel,
            'ekn://_vocab/VideoObject':
                MediaObjectModel.VideoObjectModel,
        };

        let json_ld_type = json_ld['@type'];
        if (!ekn_model_by_ekv_type.hasOwnProperty(json_ld_type))
            throw new Error('No EKN model found for json_ld type ' + json_ld_type);

        let Model = ekn_model_by_ekv_type[json_ld_type];
        let props = {};

        let ekn_id = json_ld['@id'];
        let [domain, hash] = Utils.components_from_ekn_id(ekn_id);
        props.ekn_version = this._ekn_version_from_domain(domain);

        if (props.ekn_version >= 2) {
            props.get_content_stream = () => {
                let shard_file = this._shard_file_from_domain(domain);
                let record = shard_file.find_record_by_hex_name(hash);

                if (record === null)
                    throw new Error('Could not find shard record for ' + ekn_id);

                return record.data.get_stream();
            };
        } else {
            if (json_ld.hasOwnProperty('articleBody')) {
                // Legacy databases store their HTML within the xapian databases
                // themselves and don't store a contentType property
                props.content_type = 'text/html';
                props.get_content_stream = () => {
                    return Utils.string_to_stream(json_ld.articleBody);
                };
            } else if (json_ld.hasOwnProperty('contentURL')) {
                let content_path = this._content_path_from_domain(domain);
                let model_path = GLib.build_filenamev([content_path, this._MEDIA_DIR, json_ld.contentURL]);
                // We don't care if the guess was certain or not, since the
                // content_type is a required parameter
                let [guessed_mimetype, __] = Gio.content_type_guess(model_path, null);
                props.content_type = guessed_mimetype;
                props.get_content_stream = () => {
                    let file = Gio.File.new_for_path(model_path);
                    return file.read(null);
                };
            }
        }

        return new Model(props, json_ld);
    },

    _get_xapian_uri: function (query_obj) {
        let host_uri = "http://" + this.host;
        let uri = new Soup.URI(host_uri);
        uri.set_port(this.port);
        uri.set_path('/query');

        let uri_query_args = {
            collapse: query_obj.get_collapse_value(),
            cutoff: query_obj.get_cutoff(),
            lang: this.language,
            limit: query_obj.limit,
            offset: query_obj.offset,
            order: query_obj.order === QueryObject.QueryObjectOrder.ASCENDING ? 'asc' : 'desc',
            path: GLib.build_filenamev([this._content_path_from_domain(query_obj.domain), this._DB_DIR]),
            q: query_obj.get_query_parser_string(),
            sortBy: query_obj.get_sort_value(),
        };

        uri.set_query(this._serialize_query(uri_query_args));
        return uri;
    },

    _serialize_query: function (uri_query_args) {
        let stringify_and_encode = (v) => encodeURIComponent(String(v));

        return Object.keys(uri_query_args)
        .filter((property) =>
            typeof uri_query_args[property] !== 'undefined' &&
            uri_query_args[property] !== null &&
            uri_query_args[property] !== '')
        .map((property) =>
            stringify_and_encode(property) + "=" +
            stringify_and_encode(uri_query_args[property]))
        .join('&');
    },

    // Queues a SoupMessage for *uri* to the current http session. Calls
    // *callback* on any errors encountered and the parsed JSON.
    _send_json_ld_request: function (uri, cancellable, callback) {
        let task = new AsyncTask.AsyncTask(this, cancellable, callback);
        task.catch_errors(() => {
            let request = new Soup.Message({
                method: 'GET',
                uri: uri,
            });
            this._http_session.queue_message(request, task.catch_callback_errors((session, message) => {
                let data = message.response_body.data;
                task.return_value(this._parse_json_ld_message(data));
            }));

            if (cancellable) {
                cancellable.connect(() => {
                    this._http_session.cancel_message(request, Soup.Status.CANCELLED);
                });
            }
        });
        return task;
    },

    _send_json_ld_request_finish: function (task) {
        return task.finish();
    },

    _parse_json_ld_message: function (message) {
        // The following is a patch for old databases. Prior to 2.3 the databases had the
        // old node.js knowledge engine routes hard coded. We will replace them
        // with the new ekn uri scheme.
        message = message.replace(/http:\/\/localhost:3003\/api\//g, 'ekn://');
        message = message.replace(/http:\/\/localhost:3003\//g, 'ekn://');
        // End patch

        return JSON.parse(message);
    },
});

let the_engine = null;
Engine.get_default = function () {
    if (the_engine === null) {
        // try to create an engine configured with the current locale
        var language = Utils.get_current_language();
        the_engine = new Engine({
            language: language,
        });
    }
    return the_engine;
};