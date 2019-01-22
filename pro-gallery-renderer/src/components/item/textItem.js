import React from 'react';

export default class TextItem extends React.Component {

  getTextDimensions() {
    const {style, styleParams, cubeRatio} = this.props;
    const isVerticalItem = style.ratio < (cubeRatio - 0.01);
    //text dimensions include scaling
    const transform = 'translate(0, 0) scale(' + (isVerticalItem ? (style.height / style.maxHeight) : (style.width / style.maxWidth)) + ')';
    return {
      margin: (Math.floor(style.maxHeight - style.height) / -2) + 'px ' + (Math.floor(style.maxWidth - style.width) / -2) + 'px',
      width: style.maxWidth + 'px',
      height: style.maxHeight + 'px',
      WebkitTransform: transform,
      MsTransform: transform,
      OTransform: transform,
      transform,
    };
  }

  componentWillMount() {
    this.props.actions.setItemLoaded();
  }

  processInnerhtml(html) {
    // Remove html class name from inner html elements
    // In older version of the text editor we used font themes (set as classes). Without the iframe it clashes with Santa's css
    try {
      return html.replace(/class=\"font_\d+\"/gm, '');
    } catch (e) {
      return html;
    }
  }

  render() {
    const {visible, id, styleParams, html, style, actions} = this.props;
    const processedHtml = this.processInnerhtml(html);
    const dimensions = this.getTextDimensions();
    const htmlParam = {dangerouslySetInnerHTML: {__html: processedHtml}};
    const styleIsDimensions = {style: {dimensions}};
    const changeBgColor = {style: Object.assign(dimensions, styleParams.cubeType === 'fit' ? {backgroundColor: style.bgColor} : {})};
    const show = (visible || styleParams.hasThumbnails);
    const attributes = show ? {
      ...htmlParam,
      ...changeBgColor
    } : {...styleIsDimensions};

    return (
        <div className={'gallery-item-content gallery-item-visible gallery-item gallery-item-loaded text-item'}
          key={'item-text-' + id}
          onTouchStart={actions.handleItemMouseDown}
          onTouchEnd={actions.handleItemMouseUp}
          data-hook="text-item"
          {...attributes}/>
    );
  }
}
