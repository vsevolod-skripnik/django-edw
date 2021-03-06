import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import marked from 'marked';


const TOGGLE_DESCRIPTION_DELAY = 100;

// Container

export default class List extends Component {

  render() {
    const { items, actions, loading, descriptions, meta } = this.props;
    let entities_class = "entities list-items";
    entities_class = loading ? entities_class + " ex-state-loading" : entities_class;

    return (
      <div className={entities_class}>
        {items.map(
          (child, i) =>
          <ListItem
              key={i}
              data={child}
              actions={actions}
              loading={loading}
              descriptions={descriptions}
              position={i}
              meta={meta}
          />
        )}
      </div>
    );
  }
}

// Element

class ListItem extends Component {

  state = {
    minHeight: 0,
    isHover: false
  };

  handleMouseOver(e) {
    this.toggleDescription(e);
  }

  handleMouseOut(e) {
    this.toggleDescription(e);
  }

  handleMouseClick(e) {
    const { data, actions, meta } = this.props;
    if (data.extra && data.extra.group_size) {
      actions.notifyLoadingEntities();
      actions.expandGroup(data.id, meta);
      e.preventDefault();
      e.stopPropagation();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.loading !== prevProps.loading) {
      this.setState({minHeight: 'auto'});
    }
  }

  toggleDescription(e) {
    const { data, meta, actions, descriptions } = this.props,
          id = data.id,
          lastIsHover = this.getIsHover(e.clientX, e.clientY);

    this.setState({isHover: lastIsHover});

    let context = this;
    setTimeout(function() {
      const { isHover } = context.state;

      if (lastIsHover === isHover) {
        if (isHover) {
          try {
            const area = ReactDOM.findDOMNode(context),
                  areaRect = area.getBoundingClientRect();
            context.setState({minHeight: areaRect.height});
          } catch (err) {
            // pass
          }

          actions.showDescription(id);

          if ((data.extra && data.extra.group_size) && !meta.alike && !descriptions.groups[id])
            actions.getEntityItem(data, meta);

          if ((data.extra && !data.extra.group_size) && !descriptions[id])
            actions.getEntityItem(data);

        } else {
          actions.hideDescription(id);
        }
      }
    }, TOGGLE_DESCRIPTION_DELAY);
  }

  getIsHover(clientX, clientY) {
    const area = ReactDOM.findDOMNode(this),
          areaRect = area.getBoundingClientRect(),
          posX = clientX - areaRect.left,
          posY = clientY - areaRect.top;

    return posX >= 0 && posY >= 0 && posX <= areaRect.width && posY <= areaRect.height;
  }

  render() {
    const { data, meta, descriptions } = this.props,
          url = data.extra && data.extra.url ? data.extra.url : data.entity_url,
          group_size = data.extra && data.extra.group_size ? data.extra.group_size : 0;

    let group_digit = "";
    if (group_size) {
      group_digit = (
        <div className="ex-pack">
          <span className="ex-digit">{group_size}</span>
          <div><div><div></div></div></div>
        </div>
      );
    }

    let characteristics = data.short_characteristics || [],
        marks = data.short_marks || [];

    // let related_data_marts = [];
    if (descriptions[data.id]) {
      characteristics = descriptions[data.id].characteristics || [];
      marks = descriptions[data.id].marks || [];
      // related_data_marts = descriptions[data.id].marks || [];
    }

    let description_baloon = "";
    if (characteristics.length) {
      description_baloon = (
        <div className="ex-description-wrapper">
          <ul className="ex-attrs">
            {characteristics.map(
              (child, i) =>
                <li data-path={child.path} key={i}
                  data-view-class={child.view_class.join(" ")}>
                  <strong>{child.name}:&nbsp;</strong>
                  {child.values.join("; ")}
                </li>
            )}
          </ul>
          <ul className="ex-tags">
            {marks.map(
              (child, i) =>
                <li className="ex-tag"
                    key={i}
                    data-name={child.name}
                    data-path={child.path}
                    data-view-class={child.view_class.join(" ")}>
                  <i className="fa fa-tag"></i>&nbsp;
                  {child.values.join(", ")}
                </li>
            )}
          </ul>
        </div>
      );
    }

    const className = "ex-catalog-item list-item" + (group_size ? " ex-catalog-item-variants" : "") +
        (descriptions.opened[data.id] ? " ex-state-description" : "");
    const title = group_size && !meta.alike ? data.extra.group_name : data.entity_name;

    return (
      <div className={className}
         onMouseOver={e => this.handleMouseOver(e)}
         onMouseOut={e => this.handleMouseOut(e)}
         style={{minHeight: this.state.minHeight}}>
        {group_digit}
        <div className="wrap-list-item"
             onClickCapture={e => { ::this.handleMouseClick(e); } }>
          <div className="row">
              <div className="col-md-3">
                <a href={url}>
                  <div className="ex-media" dangerouslySetInnerHTML={{__html: marked(data.media, {sanitize: false})}}/>
                </a>
              </div>

            <div className="col-md-9">
              <a href={url}>
                <h4>{title}</h4>
              </a>
              {descriptions.opened[data.id] && description_baloon}
            </div>
          </div>

          <ul className="ex-ribbons">
            {marks.map(
              (child, i) =>
                <li className="ex-wrap-ribbon"
                    key={i}
                    data-name={child.name}
                    data-path={child.path}
                    data-view-class={child.view_class.join(" ")}>
                  <div className="ex-ribbon">{child.values.join(", ")}</div>
                </li>
            )}
          </ul>
        </div>
      </div>
    );
  }
}
