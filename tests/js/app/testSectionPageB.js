const Gtk = imports.gi.Gtk;

const CssClassMatcher = imports.tests.CssClassMatcher;
const MinimalCard = imports.tests.minimalCard;
const SectionPageB = imports.app.sectionPageB;
const StyleClasses = imports.app.styleClasses;

Gtk.init(null);

describe('Section page for Template B', function () {
    let section_page;
    let card_list;

    beforeEach(function () {
        jasmine.addMatchers(CssClassMatcher.customMatchers);

        section_page = new SectionPageB.SectionPageB({
            title: "History of Guatemala"
        });

        card_list = [0, 1, 2].map(() => new MinimalCard.MinimalCard());
    });

    it('can be constructed', function () {});

    it('can set title', function () {
        section_page.title = "Brazil";
        expect(section_page.title).toBe("Brazil");
    });

    it('can set cards', function () {
        section_page.cards = card_list;
        expect(section_page.cards).toBe(card_list);
    });

    describe('Style class of section page', function () {
        it('has section-page-b class', function () {
            expect(section_page).toHaveCssClass(StyleClasses.SECTION_PAGE_B);
        });

        it('has a descendant with title class', function () {
            expect(section_page).toHaveDescendantWithCssClass(StyleClasses.SECTION_PAGE_TITLE);
        });
    });
});