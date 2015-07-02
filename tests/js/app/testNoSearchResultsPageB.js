const Gtk = imports.gi.Gtk;

const CssClassMatcher = imports.tests.CssClassMatcher;
const NoSearchResultsPage = imports.app.noSearchResultsPage;
const StyleClasses = imports.app.styleClasses;
const WidgetDescendantMatcher = imports.tests.WidgetDescendantMatcher;

Gtk.init(null);

describe('No Search Results page for Template B', function () {
    let no_search_results_page;

    beforeEach(function () {
        jasmine.addMatchers(CssClassMatcher.customMatchers);
        jasmine.addMatchers(WidgetDescendantMatcher.customMatchers);

        no_search_results_page = new NoSearchResultsPage.NoSearchResultsPageB({
            query: 'History of Guatemala'
        });
    });

    it('can be constructed', function () {});

    it('can set title', function () {
        // FIXME; this should actually verify that the query text is contained
        // within the title label text.
        expect(no_search_results_page.query).toBe('History of Guatemala');
    });

    describe('Style class of section page', function () {
        it('has no-search-results-page-b class', function () {
            expect(no_search_results_page).toHaveCssClass(StyleClasses.NO_SEARCH_RESULTS_PAGE_B);
        });

        it('has a descendant with title class', function () {
            expect(no_search_results_page).toHaveDescendantWithCssClass(StyleClasses.NO_SEARCH_RESULTS_PAGE_TITLE);
        });
    });
});