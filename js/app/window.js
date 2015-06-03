// Copyright 2014 Endless Mobile, Inc.

const Endless = imports.gi.Endless;
const GdkPixbuf = imports.gi.GdkPixbuf;
const GObject = imports.gi.GObject;
const Gdk = imports.gi.Gdk;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ArticlePage = imports.app.articlePage;
const CategoriesPage = imports.app.categoriesPage;
const HomePage = imports.app.homePage;
const HomePageA = imports.app.homePageA;
const HomePageB = imports.app.homePageB;
const Lightbox = imports.app.lightbox;
const NoSearchResultsPage = imports.app.noSearchResultsPage;
const SectionPage = imports.app.sectionPage;
const SectionArticlePage = imports.app.sectionArticlePage;
const StyleClasses = imports.app.styleClasses;

GObject.ParamFlags.READWRITE = GObject.ParamFlags.READABLE | GObject.ParamFlags.WRITABLE;

/**
 * Defines how much the background slides when switching pages, and
 * therefore also how zoomed in the background image is from its
 * original size.
 */
const PARALLAX_BACKGROUND_SCALE = 1.1;

/**
 * Class: Window
 *
 * This represents the toplevel window widget for template A, containing all
 * template A pages.
 *
 * Adds a lightbox above the section and article page, which can be
 * used to show content above either of these pages.
 */
const Window = new Lang.Class({
    Name: 'Window',
    GTypeName: 'EknWindow',
    Extends: Endless.Window,
    Properties: {
        /**
         * Property: home-page
         *
         * The <HomePageA> widget created by this widget. Read-only,
         * modify using the <HomePageA> API.
         */
        'home-page': GObject.ParamSpec.object('home-page', 'Home page',
            'The home page of this view widget.',
            GObject.ParamFlags.READABLE,
            HomePage.HomePage),
        /**
         * Property: categories-page
         *
         * The <CategoriesPage> widget created by this widget. Read-only,
         * modify using the <CategoriesPage> API.
         */
        'categories-page': GObject.ParamSpec.object('categories-page', 'Categories page',
            'The categories page of this view widget.',
            GObject.ParamFlags.READABLE,
            CategoriesPage.CategoriesPage),
        /**
         * Property: section-page
         *
         * The <SectionPageA> widget created by this widget. Read-only,
         * modify using the <SectionPageA> API.
         */
        'section-page': GObject.ParamSpec.object('section-page', 'Section page',
            'The section page of this view widget.',
            GObject.ParamFlags.READABLE,
            SectionPage.SectionPage),
        /**
         * Property: article-page
         *
         * The <ArticlePage> widget created by this widget. Read-only,
         * modify using the <ArticlePage> API.
         */
        'article-page': GObject.ParamSpec.object('article-page', 'Article page',
            'The article page of this view widget.',
            GObject.ParamFlags.READABLE,
            ArticlePage.ArticlePage),
        /**
         * Property: no-search-results-page
         *
         * The <NoSearchResultsPage> widget created by this widget. Read-only,
         * modify using the <NoSearchResultsPage> API.
         */
        'no-search-results-page': GObject.ParamSpec.object('no-search-results-page', 'No Search Results page',
            'A message page that is displayed when no search results are found.',
            GObject.ParamFlags.READABLE,
            NoSearchResultsPage.NoSearchResultsPage),
        /**
         * Property: lightbox
         *
         * The <Lightbox> widget created by this widget. Read-only,
         * modify using the <Lightbox> API. Use to show content above the <section-page>
         * or <article-page>.
         */
        'lightbox': GObject.ParamSpec.object('lightbox', 'Lightbox',
            'The lightbox of this view widget.',
            GObject.ParamFlags.READABLE,
            Lightbox.Lightbox),
        /**
         * Property: search-box
         *
         * The <SearchBox> widget created by this widget. Read-only,
         * modify using the <SearchBox> API. Use to type search queries and to display the last
         * query searched.
         */
        'search-box': GObject.ParamSpec.object('search-box', 'Search Box',
            'The Search box of this view widget',
            GObject.ParamFlags.READABLE,
            Endless.SearchBox),
        /**
         * Property: background-image-uri
         *
         * The background image uri for this window.
         * Gets set on home page of the application.
         */
        'background-image-uri': GObject.ParamSpec.string('background-image-uri', 'Background image URI',
            'The background image of this window.',
            GObject.ParamFlags.READWRITE,
            ''),
        /**
         * Property: blur-background-image-uri
         *
         * The blurred background image uri for this window.
         * Gets set on section and article pages of the application.
         */
        'blur-background-image-uri': GObject.ParamSpec.string('blur-background-image-uri', 'Blurred background image URI',
            'The blurred background image of this window.',
            GObject.ParamFlags.READWRITE,
            ''),
        /**
         * Property: template-type
         *
         * A string for the template type the window should render as
         * currently support 'A' and 'B' templates.
         */
        'template-type':  GObject.ParamSpec.string('template-type', 'Template Type',
            'Which template the window should display with',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY, 'A'),
    },
    Signals: {
        /**
         * Event: back-clicked
         *
         * This event is triggered when the back button on the top bar is clicked.
         */
        'back-clicked': {},
        /**
         * Event: forward-clicked
         *
         * This event is triggered when the forward button on the top bar is clicked.
         */
        'forward-clicked': {},
        /**
         * Event: sidebar-back-clicked
         * Emitted when the back button on the side of the section or article
         * page is clicked.
         */
        'sidebar-back-clicked': {},
        /**
         * Event: article-selected
         *
         * This event is triggered when an article is selected from the autocomplete menu.
         */
        'article-selected': {
            param_types: [GObject.TYPE_STRING]
        },
        /**
         * Event: search-entered
         *
         * This event is triggered when the user activates a search.
         */
        'search-entered': {
            param_types: [GObject.TYPE_STRING]
        },
        /**
         * Event: search-focused
         *
         * This event is triggered when the user focuses the search bar.
         */
        'search-focused': {
            param_types: [GObject.TYPE_BOOLEAN]
        },
        /**
         * Event: search-text-changed
         *
         * This event is triggered when the text in the top bar search box changed.
         */
        'search-text-changed': {
            param_types: [GObject.TYPE_OBJECT]
        },
        /**
         * Event: lightbox-nav-previous-clicked
         * Emmited when the navigation button in the lightbox is clicked. Passes
         * the media object currently displayed by the lightbox.
         */
        'lightbox-nav-previous-clicked': {
            param_types: [GObject.TYPE_OBJECT]
        },
        /**
         * Event: lightbox-nav-next-clicked
         * Emmited when the navigation button in the lightbox is clicked. Passes
         * the media object currently displayed by the lightbox.
         */
        'lightbox-nav-next-clicked': {
            param_types: [GObject.TYPE_OBJECT]
        }
    },

    TRANSITION_DURATION: 500,

    _init: function (props) {
        this.parent(props);

        this._categories_page = new CategoriesPage.CategoriesPage();
        if (this.template_type === 'B') {
            this._home_page = new HomePageB.HomePageB();
            this._section_article_page = new SectionArticlePage.SectionArticlePageB();
            this._no_search_results_page = new NoSearchResultsPage.NoSearchResultsPageB();
        } else {
            this._home_page = new HomePageA.HomePageA();
            this._section_article_page = new SectionArticlePage.SectionArticlePageA();
            this._no_search_results_page = new NoSearchResultsPage.NoSearchResultsPageA();
            // Connection so that tab buttons are revealed after page transition
            this.page_manager.connect('notify::transition-running', Lang.bind(this, function () {
                this.home_page.animating = this.page_manager.transition_running;
                this.categories_page.animating = this.page_manager.transition_running;
            }));
        }
        this._section_article_page.connect('back-clicked', function () {
            this.emit('sidebar-back-clicked');
        }.bind(this));
        this._no_search_results_page.connect('back-clicked', function () {
            this.emit('sidebar-back-clicked');
        }.bind(this));
        this._lightbox = new Lightbox.Lightbox();
        this._lightbox.connect('navigation-previous-clicked', function (media_object) {
            this.emit('lightbox-nav-previous-clicked', media_object);
        }.bind(this));
        this._lightbox.connect('navigation-next-clicked', function (media_object) {
            this.emit('lightbox-nav-next-clicked', media_object);
        }.bind(this));

        this.history_buttons = new Endless.TopbarNavButton();

        this.history_buttons.back_button.connect('clicked', function () {
            this.emit('back-clicked');
        }.bind(this));
        this.history_buttons.forward_button.connect('clicked', function () {
            this.emit('forward-clicked');
        }.bind(this));

        this.history_buttons.get_style_context().add_class(Gtk.STYLE_CLASS_LINKED);
        this.history_buttons.show_all();

        this._lightbox.add(this._section_article_page);
        this.page_manager.add(this._home_page, {
            left_topbar_widget: this.history_buttons
        });
        this.page_manager.add(this._categories_page, {
            left_topbar_widget: this.history_buttons
        });
        this._search_box = new Endless.SearchBox();
        this._search_box.connect('notify::has-focus', function () {
            this.emit('search-focused', this._search_box.has_focus);
        }.bind(this));
        this._search_box.connect('text-changed', function (search_entry) {
            this.emit('search-text-changed', search_entry);
        }.bind(this));
        this._search_box.connect('activate', function (search_entry) {
            this.emit('search-entered', search_entry.text);
        }.bind(this));
        this._search_box.connect('menu-item-selected', function (search_entry, article_id) {
            this.emit('article-selected', article_id);
        }.bind(this));
        this._search_box.show();

        this.page_manager.add(this._no_search_results_page, {
            left_topbar_widget: this.history_buttons,
            center_topbar_widget: this._search_box
        });
        this.page_manager.add(this._lightbox, {
            left_topbar_widget: this.history_buttons,
            center_topbar_widget: this._search_box
        });
        this.page_manager.transition_duration = this.TRANSITION_DURATION;
        this.page_manager.bind_property('transition-duration', this._section_article_page,
            'transition-duration', GObject.BindingFlags.SYNC_CREATE);
        this.page_manager.connect('notify::transition-running', function () {
            let context = this._no_search_results_page.get_style_context();
            if (this.page_manager.transition_running)
                context.add_class(StyleClasses.ANIMATING);
            else
                context.remove_class(StyleClasses.ANIMATING);
        }.bind(this));
        this.get_style_context().add_class(StyleClasses.SHOW_HOME_PAGE);
        this.connect('size-allocate', Lang.bind(this, function(widget, allocation) {
            let win_width = allocation.width;
            let win_height = allocation.height;
            if (this.background_image_uri &&
                (this._last_allocation === undefined ||
                (this._last_allocation.width !== win_width ||
                this._last_allocation.height !== win_height))) {
                let bg_mult_ratio = Math.max(win_width / this._background_image_width, win_height / this._background_image_height) * PARALLAX_BACKGROUND_SCALE;
                let bg_width = Math.ceil(this._background_image_width * bg_mult_ratio);
                let bg_height = Math.ceil(this._background_image_height * bg_mult_ratio);

                let frame_css = 'EknWindow { background-size: ' + bg_width + 'px ' + bg_height + 'px;}';
                let context = this.get_style_context();
                if (this._bg_size_provider === undefined) {
                    this._bg_size_provider = new Gtk.CssProvider();
                    context.add_provider(this._bg_size_provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
                }
                this._bg_size_provider.load_from_data(frame_css);
            }
            this._last_allocation = { width: win_width, height: win_height };
        }));

        this.show_all();
    },

    get home_page () {
        return this._home_page;
    },

    get categories_page () {
        return this._categories_page;
    },

    get section_page () {
        return this._section_article_page.section_page;
    },

    get article_page () {
        return this._section_article_page.article_page;
    },

    get no_search_results_page () {
        return this._no_search_results_page;
    },

    get lightbox () {
        return this._lightbox;
    },

    get search_box () {
        return this._search_box;
    },

    get background_image_uri () {
        return this._background_image_uri;
    },

    set background_image_uri (v) {
        if (this._background_image_uri === v) {
            return;
        }
        this._background_image_uri = v;
        if (this._background_image_uri !== null) {
            let frame_css = 'EknWindow.show-home-page, EknWindow.show-categories-page { background-image: url("' + this._background_image_uri + '");}';
            let provider = new Gtk.CssProvider();
            provider.load_from_data(frame_css);
            let context = this.get_style_context();
            context.add_provider(provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

            let bg_image_pixbuf;
            if (this._background_image_uri.indexOf("file://") === 0) {
                let filePath = this._background_image_uri.split("file://")[1];
                bg_image_pixbuf = GdkPixbuf.Pixbuf.new_from_file(filePath);
            } else if (this._background_image_uri.indexOf("resource://") === 0) {
                let resource = this._background_image_uri.split("resource://")[1];
                bg_image_pixbuf = GdkPixbuf.Pixbuf.new_from_resource(resource);
            } else {
                printerr("Error: background image URI is not a valid format.");
            }

            if (bg_image_pixbuf !== undefined) {
                this._background_image_width = bg_image_pixbuf.width;
                this._background_image_height = bg_image_pixbuf.height;
            }
        }
    },

    get blur_background_image_uri () {
        return this._blur_background_image_uri;
    },

    set blur_background_image_uri (v) {
        if (this._blur_background_image_uri === v) {
            return;
        }
        this._blur_background_image_uri = v;
        if (this._blur_background_image_uri !== null) {
            let frame_css = 'EknWindow.show-section-page, EknWindow.show-article-page, EknWindow.show-no-search-results-page { background-image: url("' + this._blur_background_image_uri + '");}';
            let provider = new Gtk.CssProvider();
            provider.load_from_data(frame_css);
            let context = this.get_style_context();
            context.add_provider(provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
        }
    },

    /**
     * Method: show_home_page
     *
     * This method causes the window to animate to the home page.
     */
    show_home_page: function () {
        let visible_page = this.get_visible_page();
        if (visible_page === this.categories_page) {
            this.page_manager.transition_type = Gtk.StackTransitionType.SLIDE_DOWN;
        } else {
            this.page_manager.transition_type = Gtk.StackTransitionType.SLIDE_RIGHT;
        }
        this.page_manager.visible_child = this._home_page;

        this.get_style_context().remove_class(StyleClasses.SHOW_CATEGORIES_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_SECTION_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_ARTICLE_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_NO_SEARCH_RESULTS_PAGE);
        this.get_style_context().add_class(StyleClasses.SHOW_HOME_PAGE);
    },

    /**
     * Method: show_categories_page
     *
     * This method causes the window to animate to the home page.
     */
    show_categories_page: function () {
        let visible_page = this.get_visible_page();
        if (visible_page === this.home_page) {
            this.page_manager.transition_type = Gtk.StackTransitionType.SLIDE_UP;
        } else {
            this.page_manager.transition_type = Gtk.StackTransitionType.SLIDE_RIGHT;
        }
        this.page_manager.visible_child = this._categories_page;

        this.get_style_context().remove_class(StyleClasses.SHOW_HOME_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_SECTION_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_ARTICLE_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_NO_SEARCH_RESULTS_PAGE);
        this.get_style_context().add_class(StyleClasses.SHOW_CATEGORIES_PAGE);
    },

    /**
     * Method: show_section_page
     *
     * This method causes the window to animate to the section page.
     */
    show_section_page: function () {
        let visible_page = this.get_visible_page();
        if (visible_page === this.home_page || visible_page === this.categories_page) {
            this.page_manager.transition_type = Gtk.StackTransitionType.SLIDE_LEFT;
        } else {
            this.page_manager.transition_type = Gtk.StackTransitionType.SLIDE_RIGHT;
        }
        this._section_article_page.show_article = false;
        this.page_manager.visible_child = this._lightbox;

        this.get_style_context().remove_class(StyleClasses.SHOW_HOME_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_CATEGORIES_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_ARTICLE_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_NO_SEARCH_RESULTS_PAGE);
        this.get_style_context().add_class(StyleClasses.SHOW_SECTION_PAGE);
    },

    /**
     * Method: show_article_page
     *
     * This method causes the window to animate to the article page.
     */
    show_article_page: function () {
        this.page_manager.transition_type = Gtk.StackTransitionType.SLIDE_LEFT;
        this._section_article_page.show_article = true;
        this.page_manager.visible_child = this._lightbox;

        this.get_style_context().remove_class(StyleClasses.SHOW_HOME_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_CATEGORIES_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_SECTION_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_NO_SEARCH_RESULTS_PAGE);
        this.get_style_context().add_class(StyleClasses.SHOW_ARTICLE_PAGE);
    },

    /**
     * Method: show_no_search_results_page
     *
     * This method causes the window to animate to the no-search-results page
     */
    show_no_search_results_page: function () {
        let visible_page = this.get_visible_page();
        if (visible_page === this.home_page) {
            this.page_manager.transition_type = Gtk.StackTransitionType.SLIDE_LEFT;
        } else if (visible_page === this.section_page) {
            this.page_manager.transition_type = Gtk.StackTransitionType.CROSSFADE;
        } else {
            this.page_manager.transition_type = Gtk.StackTransitionType.SLIDE_RIGHT;
        }
        this._section_article_page.show_article = false;
        this.page_manager.visible_child = this._no_search_results_page;

        this.get_style_context().remove_class(StyleClasses.SHOW_HOME_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_CATEGORIES_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_ARTICLE_PAGE);
        this.get_style_context().remove_class(StyleClasses.SHOW_SECTION_PAGE);
        this.get_style_context().add_class(StyleClasses.SHOW_NO_SEARCH_RESULTS_PAGE);
    },

    /**
     * Method: get_visible_page
     *
     * Returns the currently visible page, either the home, section or article page.
     */
    get_visible_page: function () {
        let visible_page = this.page_manager.visible_child;
        if (visible_page === this._lightbox) {
            if (this._section_article_page.show_article)
                return this._section_article_page.article_page;
            else
                return this._section_article_page.section_page;
        } else {
            return visible_page;
        }
    },

    lock_ui: function () {
        let gdk_window = this.page_manager.get_window();
        gdk_window.cursor = Gdk.Cursor.new(Gdk.CursorType.WATCH);
        this.page_manager.sensitive = false;
    },

    unlock_ui: function () {
        let gdk_window = this.page_manager.get_window();
        gdk_window.cursor = Gdk.Cursor.new(Gdk.CursorType.ARROW);
        this.page_manager.sensitive = true;
    }
});