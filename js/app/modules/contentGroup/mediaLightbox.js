const Eknc = imports.gi.EosKnowledgeContent;
const Gdk = imports.gi.Gdk;

const Actions = imports.app.actions;
const Dispatcher = imports.app.dispatcher;
const Engine = imports.search.engine;
const HistoryStore = imports.app.historyStore;
const Lightbox = imports.app.widgets.lightbox;
const Module = imports.app.interfaces.module;
const PDFView = imports.app.widgets.PDFView;

const EosKnowledgePrivate = imports.gi.EosKnowledgePrivate;

/**
 * Class: MediaLightbox
 *
 * A module which displays media content over other
 *
 * Slots:
 *   card
 */
const MediaLightbox = new Module.Class({
    Name: 'ContentGroup.MediaLightbox',
    Extends: Lightbox.Lightbox,

    Slots: {
        'card': {
            multi: true,
        },
        'content': {},
    },

    _init: function (props={}) {
        this.parent(props);

        // Lock to ensure we're only loading one lightbox media object at a time
        this._loading_new_lightbox = false;
        this._current_index = -1;
        this._context = null;

        this.add(this.create_submodule('content'));

        HistoryStore.get_default().connect('changed',
            this._on_history_changed.bind(this));
        this.connect('close-clicked', this._on_close.bind(this));
        this.connect('navigation-previous-clicked', () => this._on_previous_clicked());
        this.connect('navigation-next-clicked', () => this._on_next_clicked());
    },

    _on_history_changed: function () {
        let item = HistoryStore.get_default().get_current_item();
        if (item.media_model) {
            this._context = item.context;
            this._preview_media_object(item.media_model);
        } else {
            this.reveal_overlays = false;
        }
    },

    _on_close: function () {
        Dispatcher.get_default().dispatch({
            action_type: Actions.LIGHTBOX_CLOSED,
        });
    },

    _on_previous_clicked: function () {
        this._lightbox_shift_image(-1);
    },

    _on_next_clicked: function () {
        this._lightbox_shift_image(1);
    },

    _lightbox_shift_image: function (delta) {
        if (this._context === null)
            return;
        if (this._loading_new_lightbox)
            return;

        this._loading_new_lightbox = true;
        let new_index = this._current_index + delta;
        let resource = this._context[new_index];
        if (resource instanceof Eknc.ContentObjectModel) {
            this._preview_media_object(resource);
            this._loading_new_lightbox = false;
        } else {
            Engine.get_default().get_object_by_id(resource, null, (engine, task) => {
                this._loading_new_lightbox = false;
                let media_object;
                try {
                    media_object = engine.get_object_by_id_finish(task);
                } catch (error) {
                    logError(error);
                    return;
                }

                // If the next object is not the last, the forward arrow should be displayed.
                this._preview_media_object(media_object);
                this._loading_new_lightbox = false;
            });
        }
    },

    _preview_media_object: function (media_object) {
        if (this._context === null)
            return;
        let resources = this._context;

        this._current_index = resources.map((item) => {
            if (item instanceof Eknc.ContentObjectModel) {
                return item.ekn_id;
            }
            return item;
        }).indexOf(media_object.ekn_id);

        if (this._current_index === -1)
            return;

        if (this.lightbox_widget)
            this.drop_submodule(this.lightbox_widget);

        let widget = this.create_submodule('card', {
            model: media_object
        });

        // Lightboxes may need to show a variety of different content, in which
        // case a single card type may not fit all needs. If no card type is
        // specified, try to determine content type and show it accordingly.
        let content_type = media_object.content_type;
        if (widget === null) {
            if (media_object instanceof Eknc.VideoObjectModel) {
                widget = new EosKnowledgePrivate.MediaBin();
                widget.set_uri(media_object.ekn_id);
            } else if (content_type === 'application/pdf') {
                let stream = media_object.get_content_stream();
                widget = new PDFView.PDFView({
                    expand: true,
                    // FIXME: PDFView doesn't respond to vexpand:
                    // https://phabricator.endlessm.com/T13216
                    height_request: Gdk.Screen.get_default().get_height(),
                    visible: true,
                });
                widget.load_stream(stream, content_type);
            } else {
                printerr("Lightbox does not support this content type " + content_type);
                return;
            }
        }
        this.lightbox_widget = widget;
        this.reveal_overlays = true;
        this.has_back_button = this._current_index > 0;
        this.has_forward_button = this._current_index < resources.length - 1;
    },
});
