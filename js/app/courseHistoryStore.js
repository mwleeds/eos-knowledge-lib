// Copyright 2016 Endless Mobile, Inc.

/* exported CourseHistoryStore */

const Gdk = imports.gi.Gdk;
const GObject = imports.gi.GObject;

const Actions = imports.app.actions;
const Dispatcher = imports.app.dispatcher;
const Engine = imports.search.engine;
const HistoryItem = imports.app.historyItem;
const HistoryStore = imports.app.historyStore;
const Pages = imports.app.pages;
const QueryObject = imports.search.queryObject;
const SetMap = imports.app.setMap;
const SetObjectModel = imports.search.setObjectModel;

/**
 * Class: CourseHistoryStore
 *
 */
const CourseHistoryStore = new GObject.Class({
    Name: 'CourseHistoryStore',
    Extends: HistoryStore.HistoryStore,

    _init: function (props={}) {
        this.parent(props);

        Dispatcher.get_default().register((payload) => {
            switch(payload.action_type) {
                case Actions.HOME_CLICKED:
                case Actions.LAUNCHED_FROM_DESKTOP:
                    this.set_current_item_from_props({
                        page_type: Pages.HOME,
                        timestamp: payload.timestamp || Gdk.CURRENT_TIME,
                    });
                    break;
                case Actions.ITEM_CLICKED: {
                    if (payload.model instanceof SetObjectModel.SetObjectModel) {
                        if (!SetMap.get_parent_set(payload.model)) {
                            let props = { model: payload.model };
                            props['page_type'] = Pages.SET;
                            this.set_current_item_from_props(props);
                            this._load_first_subset(payload.model);
                        } else {
                            this.set_current_subset(payload.model);
                        }
                    }
                }
                    break;
                case Actions.NAV_BACK_CLICKED:
                    let item = this.get_current_item();
                    let types = item.page_type === Pages.ARTICLE ?
                        [Pages.HOME, Pages.SET, Pages.SEARCH] : [Pages.HOME];
                    let target_item = this.search_backwards(-1, (item) => types.indexOf(item.page_type) >= 0);
                    if (!target_item)
                        target_item = { page_type: Pages.HOME };
                    this.set_current_item(HistoryItem.HistoryItem.new_from_object(target_item));
                    break;
                case Actions.LIGHTBOX_CLOSED:
                case Actions.SEARCH_BOX_FOCUSED:
                    this.close_lightbox();
                    break;
                case Actions.ARTICLE_LINK_CLICKED:
                    this.show_ekn_id(payload.ekn_id);
                    break;
                case Actions.DBUS_LOAD_ITEM_CALLED:
                    this.load_dbus_item(payload.ekn_id, payload.query,
                        payload.timestamp);
                    break;
            }
        });
    },

    _load_first_subset: function (model) {
        let query = new QueryObject.QueryObject({
            limit: 1,
            tags_match_any: model.child_tags,
            tags_match_all: ['EknSetObject'],
            sort: QueryObject.QueryObjectSort.SEQUENCE_NUMBER,
        });
        Engine.get_default().get_objects_by_query(query, null, (engine, task) => {
            let results, info;
            try {
                [results, info] = engine.get_objects_by_query_finish(task);
            } catch (error) {
                logError(error);
                return;
            }
            if (results.length > 0) {
                this.set_current_subset(results[0]);
            }
        });
    },
});
