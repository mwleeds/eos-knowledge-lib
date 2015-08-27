// Copyright 2015 Endless Mobile, Inc.

const GObject = imports.gi.GObject;
const Lang = imports.lang;

const Dispatcher = imports.app.dispatcher;

// Similar to our actual dispatcher, but entirely synchronous and does not catch
// errors, which will make our tests easier to write and fail faster.
const MockDispatcher = new Lang.Class({
    Name: 'MockDispatcher',
    GTypeName: 'MockDispatcher',
    Extends: GObject.Object,

    _init: function (props={}) {
        this.parent(props);

        this._queue = [];
        this._listeners = {};
        this._listener_counter = 0;
        this._processing = false;
    },

    _process_queue: function () {
        this._processing = true;
        let payload = this._queue.shift();
        if (payload) {
            for (let id in this._listeners)
                this._listeners[id](payload);
            this._process_queue();
        }
        this._processing = false;
    },

    dispatch: function (payload) {
        this._queue.push(payload);
        if (!this._processing)
            this._process_queue();
    },

    register: function (callback) {
        this._listeners[this._listener_counter] = callback;
        return this._listener_counter++;
    },

    unregister: function (id) {
        delete this._listeners[id];
    },
});

// Creates a new MockDispatcher and sets it up as the dispatcher singleton. Use
// in a beforeEach to have a new dispatcher each test iteration.
let mock_default = () => {
    let dispatcher = new MockDispatcher();
    spyOn(Dispatcher, 'get_default').and.callFake(() => dispatcher);
    return dispatcher;
};