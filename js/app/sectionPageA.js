// Copyright 2014 Endless Mobile, Inc.

const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const CardsSegment = imports.app.cardsSegment;
const InfiniteScrolledWindow = imports.app.widgets.infiniteScrolledWindow;
const SectionPage = imports.app.sectionPage;
const StyleClasses = imports.app.styleClasses;

/**
 * Class: SectionPageA
 *
 * This class extends <SectionPage> and represents the section page for
 * template A of the knowledge apps.
 * In addition to the 'title' property published by <SectionPage>, it has
 * a set of articles to show. Articles are represented by cards. Cards are
 * grouped into sections call 'Segments'. A segment has a title, which is the
 * type of cards in its section, and a list of cards to display.
 *
 */
const SectionPageA = new Lang.Class({
    Name: 'SectionPageA',
    GTypeName: 'EknSectionPageA',
    Extends: SectionPage.SectionPage,

    LOADING_BOTTOM_BUFFER: 250,

    _init: function (props) {
        this._content_grid = new Gtk.Grid({
            orientation: Gtk.Orientation.VERTICAL,
            expand: true,
            valign: Gtk.Align.START,
            row_spacing: 20,
            margin_start: 100,
            margin_end: 100
        });

        this.parent(props);

        this._segments = {};

        // We need the segment titles of all be right aligned with each other.
        // This gets tricky as they aren't all in the same container, so we
        // will keep them in a size group.
        this._right_column_size_group = new Gtk.SizeGroup({
            mode: Gtk.SizeGroupMode.HORIZONTAL
        });

        this.get_style_context().add_class(StyleClasses.SECTION_PAGE_A);

        this._scrolled_window = new InfiniteScrolledWindow.InfiniteScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            bottom_buffer: this.LOADING_BOTTOM_BUFFER,
        });
        this._scrolled_window.connect('need-more-content', () =>
            this.emit('load-more-results'));

        this._scrolled_window.add(this._content_grid);
        this.add(this._scrolled_window);
    },

    pack_title_banner: function (title_banner) {
        title_banner.halign = Gtk.Align.CENTER;

        let old_banner = this._content_grid.get_child_at(0, 0);
        if (old_banner)
            this._content_grid.remove(old_banner);
        this._content_grid.attach(title_banner, 0, 0, 1, 1);
    },

    /*
     *  Method: append_to_segment
     *
     *  Appends a set of cards to the segment specified by segment_title
     *  If no segment with title of segment_title exists, this will create
     *  one.
     */
    append_to_segment: function (segment_title, cards) {
        if (segment_title in this._segments) {
            this._segments[segment_title].append_cards(cards);
        } else {
            let segment = new CardsSegment.CardsSegment({
                title: segment_title
            });
            this._right_column_size_group.add_widget(segment.title_label);
            segment.show_all();
            segment.append_cards(cards);
            this._segments[segment_title] = segment;
            this._content_grid.attach(segment, 0, Object.keys(this._segments).length, 1, 1);
        }
    },

    /*
     *  Method: remove_segment
     *
     *  Removes the segment specified by segment_title
     */
    remove_segment: function (segment_title) {
        let segment = this._segments[segment_title];
        this._content_grid.remove(segment);
        this._right_column_size_group.remove_widget(segment.title_label);
        delete this._segments[segment_title];
    },

    remove_all_segments: function () {
        for (let segment_title in this._segments) {
            this.remove_segment(segment_title);
        }
    }
});
