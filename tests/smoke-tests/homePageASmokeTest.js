const Endless = imports.gi.Endless;
const EosKnowledgePrivate = imports.gi.EosKnowledgePrivate;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const CardA = imports.app.cardA;
const HomePageA = imports.app.homePageA;
const LessonCard = imports.app.lessonCard;

const TEST_APPLICATION_ID = 'com.endlessm.knowledge.pages';
const TESTDIR = Endless.getCurrentFileDir() + '/..';

const TestApplication = new Lang.Class ({
    Name: 'TestApplication',
    Extends: Endless.Application,

    vfunc_startup: function() {
        this.parent();

        // Load and register the GResource which has content for this app
        let resource = Gio.Resource.load(TESTDIR + '/test-content/test-content.gresource');
        resource._register();

        let provider = new Gtk.CssProvider();
        let css_file = Gio.File.new_for_uri('resource:///com/endlessm/knowledge/endless_knowledge.css');
        provider.load_from_file(css_file);
        Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(),
                                                 provider,
                                                 Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

        let cards = [
            new CardA.CardA({
                title: 'Subtitled Card',
                synopsis: 'This is the Subtitle',
            }),
            new CardA.CardA({
                title: 'Picture Card',
                thumbnail_uri: TESTDIR + '/test-content/pig1.jpg',
            }),
            new CardA.CardA({
                title: 'Everything card',
                synopsis: 'This card has everything',
                thumbnail_uri: TESTDIR + '/test-content/pig2.jpg',
            }),
            new LessonCard.LessonCard({
                title: 'Mustard lesson',
                synopsis: 'Sample, incomplete',
                // By Bogdan29roman, CC-BY-SA
                // http://en.wikipedia.org/wiki/File:Mu%C5%9Ftar.jpg
                thumbnail_uri: TESTDIR + '/test-content/mustard.jpg',
                item_index: 1,
                complete: false
            })
        ];

        let home_page = new HomePageA.HomePageA({
            title_image_uri: 'resource:///com/endlessm/thrones/agot.svg'
        });
        home_page.cards = cards;

        let window = new Endless.Window({
            application: this
        });
        window.get_page_manager().add(home_page);
        window.show_all();
    }
});

let app = new TestApplication({
    application_id: TEST_APPLICATION_ID,
    flags: 0
});
app.run(ARGV);
