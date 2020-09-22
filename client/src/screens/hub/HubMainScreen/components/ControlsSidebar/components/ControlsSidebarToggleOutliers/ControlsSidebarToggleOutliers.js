import React from 'react';

import PropTypes from 'prop-types';
import UI from '../../../../../../../ui';
import { classNames } from '../../../../../../../utils';

function ControlsSiderbarToggleOutliers(props) {
  return (
    <UI.Tooltip
      tooltip={props.disabled ? 'Outlier toggler is disabled' : props.settings.persistent.displayOutliers ? 'Ignore outliers' : 'Display outliers'}
    >
      <div
        className={classNames({
          ControlsSidebar__item: true,
          disabled: props.disabled,
          active: !props.settings.persistent.displayOutliers
        })}
        onClick={evt => !props.disabled && props.setChartSettingsState({
          ...props.settings,
          persistent: {
            ...props.settings.persistent,
            displayOutliers: !props.settings.persistent.displayOutliers
          }
        })}
      >
        <UI.Icon i='scatter_plot' scale={1.7} />
      </div>
    </UI.Tooltip>
  );
}

ControlsSiderbarToggleOutliers.propTypes = {
  settings: PropTypes.object,
  disabled: PropTypes.bool,
  setChartSettingsState: PropTypes.func
};

export default ControlsSiderbarToggleOutliers;