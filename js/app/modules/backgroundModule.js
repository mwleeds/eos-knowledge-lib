// Copyright 2016 Endless Mobile, Inc.

/* exported BackgroundModule */

const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Actions = imports.app.actions;
const Dispatcher = imports.app.dispatcher;
const DominantColor = imports.app.dominantColor;
const Module = imports.app.interfaces.module;
const Utils = imports.app.utils;

// FIXME: Replace for real blurred images
const _topImage = 'resource:///com/endlessm/knowledge/data/images/background.png';

const _maxWidth = {
    small: 999,
    medium: 1499,
};

// FIXME: Tweak values when the proper cards are in use
const _topImageHeight = {
    home:    {small: 400, medium: 500, big: 600},
    section: {small: 130, medium: 170, big: 180},
    article: {small: 140, medium: 180, big: 200},
    search:  {small: 140, medium: 180, big: 200},
};

const _cssTemplate = 'EknBackgroundModule {\
    background-image: linear-gradient(@{bottom}), linear-gradient(alpha(@{overlay}, 0.4)), url("@{image}");\
    background-size: auto, auto, cover;\
    background-position: 0px @{small}px, 0px 0px, 0px 0px;\
}\
EknBackgroundModule.medium {\
    background-position: 0px @{medium}px, 0px 0px, 0px 0px;\
}\
EknBackgroundModule.big {\
    background-position: 0px @{big}px, 0px 0px, 0px 0px;\
}';

/**
 * Class: BackgroundModule
 * Module for displaying a background
 *
 * The background is composed of three layers, a blurred image that goes
 * on the top, a tinted semi-transparent overlay that covers the image
 * and a beige overlay that covers the bottom.
 *
 * The tinted overlay color is extracted from thumbnail image of a
 * <ContentObjectModel>.
 *
 * Slots:
 *   content - a template module
 */
const BackgroundModule = new Lang.Class({
    Name: 'BackgroundModule',
    GTypeName: 'EknBackgroundModule',
    Extends: Gtk.Frame,
    Implements: [ Module.Module ],

    Properties: {
        'factory': GObject.ParamSpec.override('factory', Module.Module),
        'factory-name': GObject.ParamSpec.override('factory-name', Module.Module),
        /**
         * Property: page-mode
         * Mode for setting the height breakpoints of the beige overlay
         *
         * A string specifying the mode that sets the height breakpoints of
         * the beige overlay. Each mode corresponds to a page, either 'section',
         * 'article', 'home' or 'search'.
         */
        'page-mode': GObject.ParamSpec.string('page-mode', 'Page Mode',
            'Mode for setting beige overlay height breakpoints. Either \'section\', \'article\', \'search\' or \'home\'',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            'article'),
    },

    _init: function (props={}) {
        this.parent(props);
        this.add(this.create_submodule('content'));

        this._model = null;
        this._css_class = '';
        this._bg_color = null;
        this._css_provider = new Gtk.CssProvider();

        let context = this.get_style_context();
        context.add_provider(this._css_provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

        Dispatcher.get_default().register((payload) => {
            switch (payload.action_type) {
                case Actions.FEATURE_ITEM:
                    this._set_model(payload.model);
                    break;
            }
        });

        this._idle_id = 0;
        this.connect_after('size-allocate', () => {
            if (this._idle_id) {
                return;
            }
            this._idle_id = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                this._update_css_class();
                this._idle_id = 0;
            });
        });
    },

    // Module override
    get_slot_names: function () {
        return ['content'];
    },

    _update_css_class: function () {
        let css_class = 'big';
        let alloc = this.get_allocation();

        if (alloc.width <= _maxWidth.small) {
            css_class = 'small';
        } else if (alloc.width <= _maxWidth.medium) {
            css_class = 'medium';
        }

        if (css_class === this._css_class)
            return;

        let context = this.get_style_context();
        context.remove_class(this._css_class);
        context.add_class(css_class);
        this._css_class = css_class;
    },

    _set_model: function (model) {
        // Model should not change when in home mode
        if (this.page_mode === 'home' && this._model)
            return;
        this._model = model;

        DominantColor.get_dominant_color(model, null, (helper, task) => {
            let color = helper.get_dominant_color_finish(task);
            this._set_background(color);
        });
    },

    _set_background: function (color) {
        // Take the background color from the css for the bottom part
        if (!this._bg_color) {
            let context = this.get_style_context();
            let bg_rgba = context.get_background_color(Gtk.StateFlags.NORMAL);
            this._bg_color = Utils._rgba_to_markup_color(bg_rgba);
        }

        let css_data = _cssTemplate.replace('@{overlay}', color);
        css_data = css_data.replace('@{bottom}', this._bg_color);
        css_data = css_data.replace('@{image}', _topImage);
        css_data = css_data.replace('@{small}', _topImageHeight[this.page_mode].small);
        css_data = css_data.replace('@{medium}', _topImageHeight[this.page_mode].medium);
        css_data = css_data.replace('@{big}', _topImageHeight[this.page_mode].big);
        this._css_provider.load_from_data(css_data);
    },
});