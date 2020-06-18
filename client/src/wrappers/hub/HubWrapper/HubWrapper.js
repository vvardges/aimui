import './HubWrapper.less';

import React from 'react';
import PropTypes from 'prop-types';

import * as classes from '../../../constants/classes';
import * as storeUtils from '../../../storeUtils';
import { classNames } from '../../../utils';
import BaseWrapper from '../../BaseWrapper';


class HubWrapper extends React.Component {
  render() {
    const hubClassName = classNames({
      HubWrapper: true,
      gap: this.props.gap,
    });

    return (
      <BaseWrapper>
        <div className={hubClassName}>
          <div className='HubWrapper__cont'>
            {this.props.children}
          </div>
        </div>
      </BaseWrapper>
    )
  }
}

HubWrapper.defaultProps = {
  gap: true,
};

HubWrapper.propTypes = {
  gap: PropTypes.bool,
};

export default storeUtils.getWithState(
  classes.HUB_WRAPPER,
  HubWrapper
);