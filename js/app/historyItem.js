const Eknc = imports.gi.EosKnowledgeContent;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;

const Knowledge = imports.app.knowledge;

/**
 * Class: HistoryItem
 *
 * An object to be used by a HistoryModel in order to keep track of the pages
 * that a user visits. Each HistoryItem contains the properties necessary
 * to recreate that page. This includes query parameters in the case of search
 * and article pages.
 *
 */
const HistoryItem = new Knowledge.Class({
    Name: 'HistoryItem',
    Extends: GObject.Object,

    Properties: {
        /**
         * Property: page-type
         *
         * A string that stores the type of page that corresponds to a history item.
         * Supported page types are 'search', 'section', 'article', and 'home'.
         */
        'page-type': GObject.ParamSpec.string('page-type', 'Page Type',
            'The type of page of the history object. Either \'search\', \'section\', \'article\', or \'home\'',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            ''),
        /**
         * Property: model
         * Content object model representing this page
         *
         * For 'article' pages, a <ArticleObjectModel> of the currently
         * displayed article. For 'section' pages, a <ContentObjectModel> of the
         * currently displayed set. Null for other pages.
         */
        'model': GObject.ParamSpec.object('model', 'Model',
            'Content object model representing this page',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            Eknc.ContentObjectModel),
        /**
         * Property: media-model
         * Content object model representing lightboxed media on this page
         *
         * This is used to control whether a media object is displayed in a
         * lightbox on top of the page listed in <page-type> (which displays the
         * object given in <model>.)
         *
         * If null, then no lightbox should be displayed.
         */
        'media-model': GObject.ParamSpec.object('media-model',
            'Media model',
            'Content object model representing lightboxed media on this page',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            Eknc.ContentObjectModel),
        /**
         * Property: query
         *
         * A query string entered by the user causing navigation to this history
         * item.
         */
        'query': GObject.ParamSpec.string('query', 'Query',
            'The search string entered when navigating to this page',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            ''),
        /**
         * Property: context-label
         *
         * A context label describing what category this item belongs to.
         */
        'context-label': GObject.ParamSpec.string('context-label', 'Context label',
            'The context label describing what category this item belongs to',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            ''),
        /**
         * Property: timestamp
         *
         * The timestamp of the user action that generated this item, currently
         * only used for dbus activation actions.
         */
        'timestamp': GObject.ParamSpec.uint('timestamp', 'Timestamp',
            'The timestamp of the user action that generated this item',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            0, GLib.MAXUINT32, 0),
    },

    _init: function (props={}) {
        Object.defineProperties(this, {
            /**
             * Property: context
             * List of models this model was accessed from.
             *
             * For 'article' pages, a list of articles from which the currently
             * viewed article page was selected, or null.
             */
            'context': {
                value: props.context ? props.context.slice(0) : [],
                writable: false,
            },
        });
        delete props.context;

        this.parent(props);
    },

    equals: function (item) {
        let page_equal = this.page_type === item.page_type;
        let query_equal = this.query === item.query;
        let model_equal = _models_equal_or_both_null(this.model, item.model);
        let media_equal = _models_equal_or_both_null(this.media_model,
            item.media_model);
        return page_equal && query_equal && model_equal && media_equal;
    },
});

// Helper function
function _models_equal_or_both_null (a, b) {
    if (a === null && b === null)
        return true;
    if (a === null || b === null)
        return false;
    return a.ekn_id === b.ekn_id;
}

/**
 * Function: new_from_object
 */
HistoryItem.new_from_object = function (source) {
    let props = {};
    for (let prop in source) {
        if (source.hasOwnProperty(prop) && prop.substring(0, 1) !== '_')
            props[prop] = source[prop];
    }
    return new HistoryItem(props);
};
