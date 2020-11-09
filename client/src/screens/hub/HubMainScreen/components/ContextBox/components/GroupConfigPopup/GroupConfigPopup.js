import './GroupConfigPopup.less';

import React, { useState, useRef, useEffect, Fragment } from 'react';
import ReactDOM from 'react-dom';
import UI from '../../../../../../../ui';
import { formatValue } from '../../../../../../../utils';

const margin = 5;
const offset = 30;

function GroupConfigPopup(props) {
  const configKeys = Object.keys(props.config);

  let [opened, setOpened] = useState(false);
  let [position, setPosition] = useState({});

  let containerRectRef = useRef();
  let containerRef = useRef();
  let popupRef = useRef();
  let portalRef = useRef(document.createElement('div'));
  let timerRef = useRef();

  useEffect(() => {
    if (opened && !document.body.contains(portalRef.current)) {
      document.body.append(portalRef.current);
    } else if (!opened && document.body.contains(portalRef.current)) {
      document.body.removeChild(portalRef.current);
    }
    return () => {
      if (document.body.contains(portalRef.current)) {
        document.body.removeChild(portalRef.current);
      }
    };
  }, [opened]);

  useEffect(() => {
    if (opened && popupRef.current) {
      popupRef.current.focus();
      containerRectRef.current = containerRef.current.getBoundingClientRect();
    }
  }, [opened]);

  useEffect(() => {
    if (opened && containerRef.current && popupRef.current) {
      calculatePosition();
      timerRef.current = setInterval(() => {
        if (containerRef.current && popupRef.current) {
          let containerRect = containerRef.current.getBoundingClientRect();
          if (Math.abs(containerRectRef.current.x - containerRect.x) > offset || Math.abs(containerRectRef.current.y - containerRect.y) > offset) {
            setOpened(false);
          } else {
            calculatePosition();
          }
        }
      }, 250);
    }
    return () => {
      clearInterval(timerRef.current);
    };
  }, [opened]);

  function calculatePosition() {
    let positions = {
      top: null,
      left: null
    };
    let containerRect = containerRef.current.getBoundingClientRect();
    let popupRect = popupRef.current.getBoundingClientRect();

    if (!containerRectRef.current) {
      containerRectRef.current = containerRect;
    }

    if ((containerRect.y + containerRect.height + margin + popupRect.height) >= window.innerHeight) {
      positions.top = containerRect.top - popupRect.height - margin;
    } else {
      positions.top = containerRect.bottom + margin;
    }

    if ((containerRect.x - popupRect.width + containerRect.width) <= 10) {
      positions.left = margin;
    } else {
      positions.left = containerRect.x - popupRect.width + containerRect.width;
    }

    setPosition(p => ({
      ...p,
      ...positions
    }));
  }

  return (
    <div
      ref={containerRef}
      className='GroupConfigPopup__container'
    >
      <UI.Tooltip tooltip={configKeys.join(', ')}>
        <UI.Button
          className='GroupConfigPopup__container-button'
          size='tiny'
          type='secondary'
          onClick={evt => setOpened(!opened)}
        >
          Grouped by {configKeys.length} field{configKeys.length > 1 ? 's' : ''}
        </UI.Button>
      </UI.Tooltip>
      {opened && ReactDOM.createPortal((
        <div
          className='GroupConfigPopup'
          tabIndex={0}
          ref={popupRef}
          style={position}
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
          <div className='GroupConfigPopup__header'>
            <UI.Text overline bold>Group config</UI.Text>
          </div>
          <div className='GroupConfigPopup__body'>
            {configKeys.map((configKey, i) => (
              <Fragment key={configKey}>
                <div className='GroupConfigPopup__body__row'>
                  <UI.Text type='grey-darker' small>{configKey}:</UI.Text>
                  <UI.Text type='grey-dark' small>{formatValue(props.config[configKey])}</UI.Text>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      ), portalRef.current)}
    </div>
  );
}

export default GroupConfigPopup;