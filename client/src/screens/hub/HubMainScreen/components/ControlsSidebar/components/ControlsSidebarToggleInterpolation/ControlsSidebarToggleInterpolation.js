import React from 'react';

import PropTypes from 'prop-types';
import UI from '../../../../../../../ui';
import { classNames } from '../../../../../../../utils';
import { HubMainScreenModel } from '../../../../models/HubMainScreenModel';

function ControlsSidebarToggleInterpolation(props) {
  const { setChartSettingsState } = HubMainScreenModel.emitters;
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
          setChartSettingsState({
            ...props.settings,
            persistent: {
              ...props.settings.persistent,
              interpolate: !props.settings.persistent.interpolate,
            },
          })
        }
      >
        <UI.Icon i='multiline_chart' scale={1.7} />
      </div>
    </UI.Tooltip>
  );
}

ControlsSidebarToggleInterpolation.propTypes = {
  settings: PropTypes.object,
  disabled: PropTypes.bool,
};

export default ControlsSidebarToggleInterpolation;
