import './Alert.less';

import React from 'react';

import { classNames } from '../../../../../utils';

function Alert({ children }) {
  return (
    <div
      className={classNames({
        Alert: true,
      })}
    >
      {children}
    </div>
  );
}

Alert.propTypes = {};

export default Alert;
