import './ControlsSidebar.less';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import UI from '../../../../../ui';


class ControlsSidebar extends Component {
  render() {
    return (
      <div className='ControlsSidebar'>
        <br />
        <UI.Icon i='nc-settings-gear-63' scale={1.5} />
      </div>
    );
  }
}

ControlsSidebar.propTypes = {};

export default ControlsSidebar;