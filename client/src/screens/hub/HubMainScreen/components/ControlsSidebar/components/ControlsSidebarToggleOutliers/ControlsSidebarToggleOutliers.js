import React from 'react';

import PropTypes from 'prop-types';
import UI from '../../../../../../../ui';
import { classNames } from '../../../../../../../utils';
import { HubMainScreenModel } from '../../../../models/HubMainScreenModel';

function ControlsSidebarToggleOutliers(props) {
  const { setChartSettingsState } = HubMainScreenModel.emitters;
  return (
    <UI.Tooltip
      tooltip={
        props.disabled
          ? 'Outlier toggler is disabled'
          : props.settings.persistent.displayOutliers
            ? 'Ignore outliers'
            : 'Outliers are ignored'
      }
    >
      <div
        className={classNames({
          ControlsSidebar__item: true,
          disabled: props.disabled,
          active: !props.settings.persistent.displayOutliers,
        })}
        onClick={() =>
          !props.disabled &&
          setChartSettingsState({
            ...props.settings,
            persistent: {
              ...props.settings.persistent,
              displayOutliers: !props.settings.persistent.displayOutliers,
            },
          })
        }
      >
        {props.settings.persistent.displayOutliers ? (
          <UI.Icon i='blur_on' scale={1.9} />
        ) : (
          <UI.Icon i='blur_circular' scale={1.9} />
        )}
      </div>
    </UI.Tooltip>
  );
}

ControlsSidebarToggleOutliers.propTypes = {
  settings: PropTypes.object,
  disabled: PropTypes.bool,
};

export default ControlsSidebarToggleOutliers;
