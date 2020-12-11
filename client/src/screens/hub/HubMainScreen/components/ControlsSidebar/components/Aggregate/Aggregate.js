import React from 'react';
import UI from '../../../../../../../ui';
import PropTypes from 'prop-types';
import { classNames } from '../../../../../../../ui/utils';

function Aggregate(props) {
  const { aggregated, setContextFilter, disabled } = props;
  return (
    <UI.Tooltip
      tooltip={aggregated ? 'Deaggregate metrics' : 'Aggregate metrics'}
    >
      <div
        className={classNames({
          ControlsSidebar__item: true,
          active: aggregated,
          disabled: disabled,
        })}
        onClick={(evt) =>
          setContextFilter({
            aggregated: !aggregated,
          })
        }
      >
        <UI.Icon i="group_work" scale={1.7} />
      </div>
    </UI.Tooltip>
  );
}

Aggregate.propTypes = {
  aggregated: PropTypes.bool,
  setContextFilter: PropTypes.func,
};

export default Aggregate;
