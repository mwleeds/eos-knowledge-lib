/* exported All */

// Copyright 2017 Endless Mobile, Inc.

const Eknc = imports.gi.EosKnowledgeContent;
const GLib = imports.gi.GLib;

const Module = imports.app.interfaces.module;
const Xapian = imports.app.modules.selection.xapian;

/**
 * Class: All
 * Retrieves all content
 *
 * This Selection is meant to be used with one or more Filters.
 */
const All = new Module.Class({
    Name: 'Selection.All',
    Extends: Xapian.Xapian,

    _init: function (props={}) {
        this.parent(props);
        this._set_needs_refresh(true);
    },

    construct_query_object: function (limit, query_index) {
        if (query_index > 0)
            return null;
        return Eknc.QueryObject.new_from_props({
            limit: limit,
        });
    },
});
