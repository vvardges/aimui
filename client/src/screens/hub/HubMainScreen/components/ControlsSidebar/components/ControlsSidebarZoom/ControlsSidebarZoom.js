import React, { useState, useEffect, useRef } from 'react';

import PropTypes from 'prop-types';
import UI from '../../../../../../../ui';
import { classNames } from '../../../../../../../utils';
import * as _ from 'lodash';

function ControlsSidebarZoom(props) {
  let [opened, setOpened] = useState(false);
  let popupRef = useRef();

  let zoomedChartIndeces = Object.keys(props.zoom || {}).filter(chartIndex => props.zoom?.[chartIndex] !== null && props.zoom?.[chartIndex] !== undefined);

  useEffect(() => {
    if (opened && popupRef.current) {
      popupRef.current.focus();
    }
  }, [opened]);

  useEffect(() => {
    if (zoomedChartIndeces.length === 0) {
      setOpened(false);
    }
  }, [props.zoom]);

  return (
    <>
      <div
        className={classNames({
          ControlsSidebar__item: true,
          active: props.zoomMode,
        })}
        onClick={evt => props.setChartSettingsState({
          zoomMode: !props.zoomMode
        })}
        title='Zoom in'
      >
        <UI.Icon i='zoom_in' scale={1.7} />
      </div>
      <div className='ControlsSidebar__item__wrapper'>
        <div
          className={classNames({
            ControlsSidebar__item: true,
            disabled: zoomedChartIndeces.length === 0,
          })}
          onClick={evt => {
            if (props.zoom !== null) {
              props.setChartSettingsState({
                zoomMode: false,
                zoom: props.zoomHistory[0] === null || props.zoomHistory[0] === undefined ? null : {
                  ...props.zoom ?? {},
                  [props.zoomHistory[0][0]]: props.zoomHistory[0][1]
                },
                zoomHistory: props.zoomHistory.slice(1)
              });
              setOpened(false);
            }
          }}
          title='Zoom out'
        >
          <UI.Icon i='zoom_out' scale={1.7} />
        </div>
        {props.zoomHistory.length > 0 && (
          <div
            className={classNames({
              ControlsSidebar__item__popup__opener: true,
              active: opened
            })}
            onClick={evt => setOpened(!opened)}
          >
            <UI.Icon i='chevron_left' />
          </div>
        )}
        {opened && (
          <div
            className='ControlsSidebar__item__popup list'
            tabIndex={0}
            ref={popupRef}
            onBlur={evt => {
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
              <UI.Text overline bold>Select option to zoom out</UI.Text>
            </div>
            <div className='ControlsSidebar__item__popup__list'>
              {
                zoomedChartIndeces.map(chartIndex => (
                  <div
                    key={chartIndex}
                    className='ControlsSidebar__item__popup__list__item'
                    onClick={evt => {
                      let historyIndex = _.findIndex(props.zoomHistory, item => item[0] === +chartIndex);
                      props.setChartSettingsState({
                        zoomMode: false,
                        zoom: {
                          ...props.zoom ?? {},
                          [chartIndex]: props.zoomHistory[historyIndex]?.[1] ?? null
                        },
                        zoomHistory: props.zoomHistory.filter((item, index) => index !== historyIndex)
                      });
                    }}
                  >
                    <UI.Text small>Zoom out chart</UI.Text>
                    <div className='ContextBox__table__group-indicator__chart'>
                      <UI.Text>{+chartIndex + 1}</UI.Text>
                    </div>
                  </div>
                ))
              }
              <div
                className='ControlsSidebar__item__popup__list__item'
                onClick={evt => {
                  props.setChartSettingsState({
                    zoomMode: false,
                    zoom: null,
                    zoomHistory: []
                  });
                  setOpened(false);
                }}
              >
                <UI.Text small>Reset zooming</UI.Text>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

ControlsSidebarZoom.propTypes = {
  zoomMode: PropTypes.bool,
  zoom: PropTypes.object,
  zoomHistory: PropTypes.array,
  setChartSettingsState: PropTypes.func,
};

export default ControlsSidebarZoom;