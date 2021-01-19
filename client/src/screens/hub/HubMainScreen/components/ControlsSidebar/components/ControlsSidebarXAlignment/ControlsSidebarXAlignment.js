import './ControlsSidebarXAlignment.less';

import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

import UI from '../../../../../../../ui';
import { classNames } from '../../../../../../../utils';
import { HubMainScreenModel } from '../../../../models/HubMainScreenModel';

function ControlsSidebarXAlignment(props) {
  let [opened, setOpened] = useState(false);

  let popupRef = useRef();

  const {
    setChartSettingsState,
    setChartPointsCount,
    setTraceList,
  } = HubMainScreenModel.emitters;
  const { xAlignment, pointsCount } = props.settings.persistent;

  function changeXAlignment(type) {
    setChartSettingsState(
      {
        ...props.settings,
        persistent: {
          ...props.settings.persistent,
          xAlignment: type,
        },
      },
      setTraceList,
    );
    setOpened(false);
  }

  useEffect(() => {
    if (opened && popupRef.current) {
      popupRef.current.focus();
    }
  }, [opened]);

  return (
    <div className='ControlsSidebar__item__wrapper'>
      <UI.Tooltip tooltip='X-axis properties'>
        <div
          className={classNames({
            ControlsSidebar__item: true,
            active: opened,
            column: true,
          })}
          onClick={(evt) => setOpened(!opened)}
        >
          <UI.Text small italic>
            X
          </UI.Text>
          <UI.Icon i='arrow_right_alt' scale={1.2} />
        </div>
      </UI.Tooltip>
      {opened && (
        <div
          className='ControlsSidebar__item__popup list'
          tabIndex={0}
          ref={popupRef}
          onBlur={(evt) => {
            const currentTarget = evt.currentTarget;
            if (opened) {
              window.setTimeout(() => {
                if (!currentTarget.contains(document.activeElement)) {
                  setOpened(false);
                }
              }, 200);
            }
          }}
        >
          <div className='ControlsSidebar__item__popup__header'>
            <UI.Text overline bold>
              X-axis properties
            </UI.Text>
          </div>
          <div>
            <UI.Text
              className='ControlsSidebarXAlignment__overline ControlsSidebarXAlignment__overline--align'
              type='primary'
              overline
              bold
            >
              Align X-axis by:
            </UI.Text>
            <div className='ControlsSidebar__item__popup__list'>
              {['step', 'epoch'].map((type) => (
                <div
                  key={type}
                  className={classNames({
                    ControlsSidebar__item__popup__list__item: true,
                    active: xAlignment === type,
                  })}
                  onClick={() => changeXAlignment(type)}
                >
                  <UI.Text small>{type.replace('_', ' ')}</UI.Text>
                </div>
              ))}
            </div>
          </div>
          <UI.Line />
          <div>
            <UI.Text
              className='ControlsSidebarXAlignment__overline'
              type='primary'
              overline
              bold
            >
              Number of steps:
            </UI.Text>
            <div className='ControlsSidebarXAlignment__range__wrapper'>
              <UI.RangeSlider
                min={10}
                max={500}
                value={pointsCount}
                onChange={setChartPointsCount}
                ticks={{
                  10: 10,
                  100: 100,
                  200: 200,
                  300: 300,
                  400: 400,
                  500: 500,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ControlsSidebarXAlignment.propTypes = {
  settings: PropTypes.object,
};

export default ControlsSidebarXAlignment;
