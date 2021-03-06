// Copyright 2017 Endless Mobile, Inc.

const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const ArticleContent = imports.app.interfaces.articleContent;
const Card = imports.app.interfaces.card;
const EosKnowledgePrivate = imports.gi.EosKnowledgePrivate;
const Module = imports.app.interfaces.module;

// Make sure included for glade template
const Utils = imports.app.utils;

/**
 * Class: Audio
 *
 * A card for displaying audio content
 *
 * This widget displays the title if enabled via properties, the synopsis if
 * included in the object model, and the player for reproducing the audio.
 *
 * Style classes:
 *   CardAudio - on the widget itself
 *   CardAudio__title - on the title label
 *   CardAudio__synopsis - on the synopsis label
 *   CardAudio__player - on the audio player
 */
const Audio = new Module.Class({
    Name: 'Card.Audio',
    Extends: Gtk.Grid,
    Implements: [Card.Card, ArticleContent.ArticleContent],

    Properties: {
        /**
         * Property: show-title
         *
         * Set true if the title label should be visible.
         */
        'show-title':  GObject.ParamSpec.boolean('show-title', 'Show Title Label',
            'Whether to show the title label',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY, true),
    },

    Template: 'resource:///com/endlessm/knowledge/data/widgets/card/audio.ui',
    InternalChildren: [ 'title-label', 'synopsis-label' ],

    _init: function (props={}) {
        this.parent(props);

        this.set_title_label_from_model(this._title_label);
        this.set_label_or_hide(this._synopsis_label, this.model.synopsis);

        this._title_label.visible = this.show_title;
        let player = new EosKnowledgePrivate.MediaBin({ audio_mode: true });
        player.get_style_context().add_class(Utils.get_element_style_class(Audio, 'player'));
        player.set_uri(this.model.ekn_id)
        player.show_all();
        this.attach(player, 0, 3, 1, 1);
        this.content_view = player;
    },

    load_content_promise: function () {
        return Promise.resolve();
    },

    set_active: function (is_active) {
        if (!is_active) {
            this.content_view.stop();
        }
    },
});
