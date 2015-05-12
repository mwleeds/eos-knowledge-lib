const EosKnowledge = imports.gi.EosKnowledge;
const GObject = imports.gi.GObject;
const Lang = imports.lang;

const MockButton = new Lang.Class({
    Name: 'MockButton',
    Extends: GObject.Object,
    Properties: {
        'sensitive': GObject.ParamSpec.boolean('sensitive', '', '',
            GObject.ParamFlags.READWRITE, true),
    },
    Signals: {
        'clicked': {},
    },
});

const MockView = new Lang.Class({
    Name: 'MockView',
    Extends: GObject.Object,

    _init: function () {
        this.parent();

        this.history_buttons = {
            back_button: new MockButton(),
            forward_button: new MockButton(),
        };
    },
});

describe('History Presenter', function () {
    let history_presenter;
    let history_model;
    let view;

    beforeEach(function () {
        view = new MockView();
        history_model = new EosKnowledge.HistoryModel();

        history_presenter = new EosKnowledge.HistoryPresenter({
            history_model: history_model,
            view: view,
        });
    });

    it('can be constructed', function () {});
});