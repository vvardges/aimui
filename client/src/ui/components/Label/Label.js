import './Label.less';

import React from 'react';
import PropTypes from 'prop-types';

import { classNames } from '../../utils';

function Label({ className, children, size, spacing, color, outline, rounded, iconLeft, onClick }) {
  const elemClassName = classNames({
    Label: true,
    [size]: true,
    spacing: spacing,
    outline: outline,
    rounded: rounded,
    [className]: !!className,
  });

  return (
    <div
      className={elemClassName}
      style={{
        backgroundColor: outline ? '' : color,
        borderColor: outline ? color : 'transparent',
      }}
      onClick={onClick || null}
    >
      {!!iconLeft &&
        <div className='Label__icon'>
          {iconLeft}
        </div>
      }
      <div className='Label__content'>
        {children}
      </div>
    </div>
  )
}

Label.defaultProps = {
  size: 'small',
  spacing: false,
  color: '#CCC',
  outline: false,
  rounded: false,
  iconLeft: null,
};

Label.propTypes = {
  size: PropTypes.oneOf(['tiny', 'small', 'medium', 'large']),
  color: PropTypes.string,
  spacing: PropTypes.bool,
  outline: PropTypes.bool,
  rounded: PropTypes.bool,
  iconLeft: PropTypes.node,
};

export default React.memo(Label);