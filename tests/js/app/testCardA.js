const Gtk = imports.gi.Gtk;

const CardA = imports.app.cardA;
const CssClassMatcher = imports.tests.CssClassMatcher;
const StyleClasses = imports.app.styleClasses;

Gtk.init(null);

describe('Card widget', function () {
    let card;

    beforeEach(function () {
        jasmine.addMatchers(CssClassMatcher.customMatchers);

        card = new CardA.CardA();
    });

    describe('Style class of card', function () {
        it('has card class', function () {
            expect(card).toHaveCssClass(StyleClasses.CARD_A);
        });
    });
});