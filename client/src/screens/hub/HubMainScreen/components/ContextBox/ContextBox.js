import './ContextBox.less';

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import HubMainScreenContext from '../../HubMainScreenContext/HubMainScreenContext';
import { classNames } from '../../../../../utils';
import UI from '../../../../../ui';


class ContextBox extends Component {
  formatValue = (v) => {
    return v ? Math.round(v * 10e6) / 10e6 : 0;
  };

  _renderItem = (i, key) => {
    const index = this.context.contextStepIndex;

    if (i.num_steps <= index) {
      return null;
    }

    const color = this.context.getLineColor(i);

    const className = classNames({
      ContextBox__item: true,
      active: this.context.contextActiveStepIndex === key,
    });

    let style = {};
    if (this.context.contextActiveStepIndex === key) {
      style = {
        borderLeftColor: color,
      };
    }

    return (
      <div className={className} style={style} key={key}>
        <UI.Text color={color} small>
          {i.tag ? `${i.tag}: ` : ''}
          {this.formatValue(this.context.getLineValueByStep(i.data, index))}
        </UI.Text>
      </div>
    );
  };

  _renderItems = () => {
    if (!this.context.data || !this.context.data.length) {
      return null;
    }

    return (
      <div className='ContextBox__items'>
        {this.context.data.map((i, iKey) => (
          this._renderItem(i, iKey)
        ))}
      </div>
    );

  };

  render() {
    return (
      <div className='ContextBox'>
        {this._renderItems()}
      </div>
    );
  }
}

ContextBox.propTypes = {};

ContextBox.contextType = HubMainScreenContext;

export default ContextBox;