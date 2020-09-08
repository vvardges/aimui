import React from 'react';
import UI from '../../../../../../../ui';
import PropTypes from 'prop-types';
import { classNames } from '../../../../../../../ui/utils';

function Aggregate(props) {
  const { aggregated, setContextFilter, disabled } = props;
  return (
    <div
      className={classNames({
        ControlsSidebar__item: true,
        active: aggregated,
        disabled: disabled
      })}
      onClick={evt => setContextFilter({
        aggregated: !aggregated
      })}
      title={aggregated ? 'Deaggregate' : 'Aggregate'}
    >
      <UI.Icon i='group_work' scale={1.7} />
    </div>
  );
}

Aggregate.propTypes = {
  aggregated: PropTypes.bool,
  setContextFilter: PropTypes.func
};

export default Aggregate;