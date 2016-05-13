// Copyright 2015 Endless Mobile, Inc.

const Gettext = imports.gettext;
const Gtk = imports.gi.Gtk;

const Card = imports.app.interfaces.card;
const Module = imports.app.interfaces.module;
const Config = imports.app.config;
const Utils = imports.app.utils;

let _ = Gettext.dgettext.bind(null, Config.GETTEXT_PACKAGE);

/**
 * Class: Reader
 *
 * A card implementation with sizing and styling specific to Reader apps.
 *
 * CSS Styles:
 *    card, reader-card - on the card itself
 *    card-info-frame - card info frame
 *    card-info-title - card info title
 *    title - card's label
 *    decorative-bar - ornament on the top of the card
 *    hover-frame - hover frame
 */
const Reader = new Module.Class({
    Name: 'ReaderCard',
    CssName: 'EknReaderCard',
    Extends: Gtk.Button,
    Implements: [Card.Card],

    Template: 'resource:///com/endlessm/knowledge/data/widgets/readerCard.ui',
    InternalChildren: [  'title-label', 'archive-icon', 'card-info-grid',
        'card-info-label', 'hover-frame' ],

    _init: function(props={}) {
        this.parent(props);

        this.set_title_label_from_model(this._title_label);
        this.set_style_variant_from_model();

        // page_number of -1 means an archived article
        if (this.model.page_number > 0) {
            this._card_info_label.label = (_("Page %s").format('<b>' + (this.model.page_number + 1) + '</b>'));
            this._card_info_grid.remove(this._archive_icon);
        }

        this.connect('enter-notify-event', () => {
            this._hover_frame.show();
        });

        this.connect('leave-notify-event', () => {
            this._hover_frame.hide();
        });
    },

    // For entirely fixed-size cards

    vfunc_get_preferred_width: function () {
        let [min] = this.parent();
        return [min, min];
    },

    vfunc_get_preferred_height: function () {
        let [min] = this.parent();
        return [min, min];
    },
});

function get_css_for_module (css_data, num) {
    let str = "";
    let background_color = css_data['title-background-color'];
    if (typeof background_color !== 'undefined') {
        str += Utils.object_to_css_string({'background-color': background_color},
            '.reader-card.variant' + num + ' .decorative-bar');
        delete css_data['title-background-color'];
    }
    str += Utils.get_css_for_title_and_module(css_data,
        '.reader-card.variant' + num + ' .title',
        '.reader-card.variant' + num + ' .attribution');
    return str;
}