import './Label.less';

import React from 'react';
import PropTypes from 'prop-types';

import { classNames } from '../../utils';

function Label({ className, children, size, spacing, color, onClick }) {
  const elemClassName = classNames({
    Label: true,
    [size]: true,
    spacing: spacing,
    [className]: !!className,
  });

  return (
    <span
      className={elemClassName}
      style={{backgroundColor: color}}
      onClick={onClick || null}
    >
      {children}
    </span>
  )
}

Label.defaultProps = {
  size: 'small',
  spacing: false,
  color: '#CCC',
};

Label.propTypes = {
  size: PropTypes.oneOf(['tiny', 'small', 'medium', 'large']),
  color: PropTypes.string,
  spacing: PropTypes.bool,
};

export default React.memo(Label);