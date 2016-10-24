import { combineReducers } from 'redux';
import _ from 'underscore';
import * as consts from '../constants/TermsTree';

/* Tree Data Structures */

class Tree {
  constructor(json) {
    this.json = json;
    this.hash = {};
    this.root = this.json2tree(json);
  }

  json2tree(json, parent = false) {
    if (parent == false) {
      parent = new Item();
    }
    for (let i = 0; i < json.length; i++) {
      let child = json[i];
      let options = {
        'id': child.id,
        'name': child.name,
        'slug': child.slug,
        'short_description': child.short_description,
        'semantic_rule': child.semantic_rule,
        'specification_mode': child.specification_mode,
        'structure': child.structure,
        'is_leaf': child.is_leaf,
        'parent': parent,
      };
      let item = new Item(options);
      item.children = this.json2tree(child.children, item).children;
      parent.children.push(item);
    }
    this.hash[parent.id] = parent;
    return parent;
  }
}

class Item {
  constructor(options) {
    let defaults = {
      'id': -1,
      'name': '',
      'slug': '',
      'short_description': '',
      'semantic_rule': consts.SEMANTIC_RULE_AND,
      'specification_mode': consts.STANDARD_SPECIFICATION,
      'structure': consts.STRUCTURE_NULL,
      'is_leaf': true,
      'parent': false,
      'children': []
    }
    Object.assign(this, defaults);
    Object.assign(this, options);
  }

  getParent() {
    return this.parent;
  }

  getChildren() {
    return this.children;
  }

  getSiblings() {
    let parent = this.getParent();
    if (!_.isUndefined(parent.getChildren)) {
      let siblings = parent.getChildren();
      return siblings.filter(item => item.id != this.id);
    } else {
      return [];
    }
  }

  isLimbDescendant() {
    if (this.structure == consts.STRUCTURE_LIMB)
      return true;
    let parent = this.getParent();
    if (parent != false) {
      if (parent.structure == consts.STRUCTURE_LIMB)
        return true;
      return parent.isLimbDescendant();
    }
    return false;
  }

  isLimbAndLeaf() {
    return (
      this.structure == consts.STRUCTURE_LIMB && this.is_leaf
    );
  }
}

/* Tagged Data Structures */

class TaggedItems {

  toggle(item) {
    if (this[item.id] == true) {
      this.untag(item);
    } else {
      this[item.id] = true;
      let parent = item.getParent();
      if (parent && parent.semantic_rule == consts.SEMANTIC_RULE_OR) {
        this.untagSiblings(item);
      }
    }
    return Object.assign(new TaggedItems(), this);
  }

  resetItem(item) {
    this.untag(item);
    return Object.assign(new TaggedItems(), this);
  }

  untag(item) {
    this[item.id] = false;
    let children = item.getChildren();
    for (let i = 0; i < children.length; i++) {
      this.untag(children[i]);
    }
  }

  untagSiblings(item) {
    let siblings = item.getSiblings();
    for (let i = 0; i < siblings.length; i++) {
      this.untag(siblings[i]);
    }
  }

  isAnyTagged(arr) {
    for (let i = 0; i < arr.length; i++) {
      if (this[arr[i].id] == true)
        return true;
    }
    return false;
  }
}

/* Expanded Data Structures */

class ExpandedItems {

  constructor(json) {
    this.json2items(json)
  }

  json2items(json) {
    for (let i = 0; i < json.length; i++) {
      let child = json[i];

      let mode = child.specification_mode,
          is_standard = mode == consts.STANDARD_SPECIFICATION,
          is_expanded = mode == consts.EXPANDED_SPECIFICATION,
          is_leaf = child.is_leaf,
          is_limb = child.structure == consts.STRUCTURE_LIMB;

      this[child.id] = false;
      if ((is_standard && is_limb && !is_leaf) || is_expanded)
        this[child.id] = true;

      this.json2items(child.children);
    }
  }

  toggle(item) {
    this[item.id] = !this[item.id];
    return Object.assign(new ExpandedItems([]), this);
  }

  reload(json) {
    return Object.assign(new ExpandedItems(json), this);
  }
}

/* Requested Data Structures */

class Requested {

  constructor() {
    this.array = [];
  }

  toggle(item) {
    if (this[item.id] != true &&
        !item.is_leaf &&
        !item.getChildren().length) {
      this[item.id] = true;
      this.array.push(item.id);
      return Object.assign(new Requested(), this);
    } else {
      return this;
    }
  }
}

/* Expanded Info Structures */

class ExpandedInfoItems {
  show(item) {
    let ei = new ExpandedInfoItems();
    ei[item.id] = true;
    return ei;
  }

  hide(item) {
    return new ExpandedInfoItems(); 
  }
}

function tree(state = new Tree([]), action) {
  switch (action.type) {
    case consts.LOAD_TREE:
      return new Tree(action.json);
    case consts.RELOAD_TREE:
      return new Tree(action.json);
    default:
      return state;
  }
}

function requested(state = new Requested(), action) {
  switch (action.type) {
    case consts.TOGGLE_ITEM:
      return state.toggle(action.term);
    default:
      return state;
  }
}

function tagged(state = new TaggedItems(), action) {
  switch (action.type) {
    case consts.TOGGLE_ITEM:
      return state.toggle(action.term);
    case consts.RESET_ITEM:
      return state.resetItem(action.term);
    default:
      return state;
  }
}

function expanded(state = new ExpandedItems([]), action) {
  switch (action.type) {
    case consts.LOAD_TREE:
      return new ExpandedItems(action.json);
    case consts.RELOAD_TREE:
      return state.reload(action.json);
    case consts.TOGGLE_ITEM:
      return state.toggle(action.term);
    default:
      return state;
  }
}

function infoExpanded(state = new ExpandedInfoItems(), action) {
  switch (action.type) {
    case consts.SHOW_INFO:
      return state.show(action.term);
    case consts.HIDE_INFO:
      return state.hide(action.term);
    default:
      return state;
  }
}

const terms = combineReducers({
    tree: tree,
    requested: requested,
    tagged: tagged,
    expanded: expanded,
    info_expanded: infoExpanded
})

export default terms;

