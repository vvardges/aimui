import React from 'react';

import PropTypes from 'prop-types';
import UI from '../../../../../../../ui';
import { classNames } from '../../../../../../../utils';

function ControlsSidebarToggleInterpolation(props) {
  return (
    <UI.Tooltip
      tooltip={
        props.disabled
          ? ''
          : `${
              props.settings.persistent.interpolate ? 'Cubic' : 'Linear'
            } interpolation method is applied`
      }
    >
      <div
        className={classNames({
          ControlsSidebar__item: true,
          disabled: props.disabled,
          active: props.settings.persistent.interpolate,
        })}
        onClick={(evt) =>
          !props.disabled &&
          props.setChartSettingsState({
            ...props.settings,
            persistent: {
              ...props.settings.persistent,
              interpolate: !props.settings.persistent.interpolate,
            },
          })
        }
      >
        <UI.Icon i="multiline_chart" scale={1.7} />
      </div>
    </UI.Tooltip>
  );
}

ControlsSidebarToggleInterpolation.propTypes = {
  settings: PropTypes.object,
  disabled: PropTypes.bool,
  setChartSettingsState: PropTypes.func,
};

export default ControlsSidebarToggleInterpolation;
