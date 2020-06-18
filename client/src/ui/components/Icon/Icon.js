import './nucleo/nucleo.less';
import './Icon.less';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '../../utils';

class Icon extends Component {
  render() {
    const className = classNames({
      Icon: true,
      [this.props.className]: this.props.className,
      [this.props.i]: this.props.i,
      'nc-icon': true,
      no_spacing_right: !this.props.spacingRight,
    });

    return (
      <span
        onClick={this.props.onClick}
        className={className}
        style={{
          ...this.props.style,
          fontSize: `${this.props.scale}em`,
        }}
      />
    );
  }
}

Icon.defaultProps = {
  scale: 1,
  onClick: () => {},
};

Icon.propTypes = {
  i: PropTypes.string.isRequired,
  spacingRight: PropTypes.bool,
  scale: PropTypes.number,
  onClick: PropTypes.func,
};

export default Icon;