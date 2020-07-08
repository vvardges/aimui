import './Button.less';

import React from 'react';
import PropTypes from 'prop-types';

import { classNames } from '../../utils';


function Button(props) {
  const className = classNames({
    Button: true,
    [props.className]: !!props.className,
    [props.size]: true,
    [props.type]: true,
    ghost: props.ghost,
    gradient: props.gradient,
    no_gradient: !props.gradient,
    disabled: props.disabled,
  });

  return (
    <button
      className={className}
      onClick={(e) => props.onClick && props.onClick(e)}
      style={props.style}
    >
      <div className='Button__before'>
        {props.beforeContent}
      </div>
      {props.children}
      <div className='Button__after'>
        {props.afterContent}
      </div>
    </button>
  )
}

export function Buttons(props) {
  return (
    <div className={classNames({
      Buttons: true,
      [props.className]: !!props.className,
    })}>
      {props.children}
    </div>
  )
}

Button.defaultProps = {
  size: 'medium',
  type: 'primary',
  ghost: false,
  gradient: false,
  style: {},
};

Button.propTypes = {
  size: PropTypes.oneOf(['tiny', 'small', 'medium', 'large']),
  type: PropTypes.oneOf(['primary', 'secondary', 'positive', 'negative',]),
  style: PropTypes.object,
  ghost: PropTypes.bool,
  gradient: PropTypes.bool,
  disabled: PropTypes.bool,
  beforeContent: PropTypes.node,
  afterContent: PropTypes.node,
  onClick: PropTypes.func,
  children: PropTypes.string,
};

export default React.memo(Button);