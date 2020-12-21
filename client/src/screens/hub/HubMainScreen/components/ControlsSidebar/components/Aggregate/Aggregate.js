import React from 'react';
import UI from '../../../../../../../ui';
import PropTypes from 'prop-types';
import { classNames } from '../../../../../../../ui/utils';
import { HubMainScreenModel } from '../../../../models/HubMainScreenModel';

function Aggregate(props) {
  const { aggregated, disabled } = props;
  const { setContextFilter } = HubMainScreenModel.emitters;
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
        <UI.Icon i='group_work' scale={1.7} />
      </div>
    </UI.Tooltip>
  );
}

Aggregate.propTypes = {
  aggregated: PropTypes.bool,
};

export default Aggregate;
