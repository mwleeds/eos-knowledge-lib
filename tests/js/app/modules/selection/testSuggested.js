const Gtk = imports.gi.Gtk;

const Utils = imports.tests.utils;
Utils.register_gresource();

const Compliance = imports.tests.compliance;
const HistoryStore = imports.app.historyStore;
const Suggested = imports.app.modules.selection.suggested;

Gtk.init(null);

function setup (store) {
    // Selection.Suggested only works when the global state is aware of a search
    // query
    store.set_current_item_from_props({
        page_type: 'search',
        query: 'foobar',
    });
}

Compliance.test_selection_compliance(Suggested.Suggested, setup);
Compliance.test_xapian_selection_compliance(Suggested.Suggested, setup);
