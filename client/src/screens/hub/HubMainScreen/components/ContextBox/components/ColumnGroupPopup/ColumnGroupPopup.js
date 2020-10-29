import './ColumnGroupPopup.less';

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import UI from '../../../../../../../ui';
import { classNames } from '../../../../../../../utils';

const margin = 5;
const offset = 30;

function ColumnGroupPopup(props) {
  let [opened, setOpened] = useState(false);
  let [position, setPosition] = useState({});

  const { contextFilter, setContextFilter, param, triggerer } = props;
  const { groupByColor, groupByStyle, groupByChart } = contextFilter;

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

  function filterIncludesParam(groupFilter) {
    for (let i = 0; i < groupFilter.length; i++) {
      if (groupFilter[i] === param || param === `params.${groupFilter[i]}`) {
        return true;
      }
    }
    return false;
  }

  function toggleGrouping(filterName, groupFilter) {
    setContextFilter({
      [filterName]: filterIncludesParam(groupFilter) ? groupFilter.filter(key => key !== param) : groupFilter.concat([param])
    });
  }

  return (
    <>
      <UI.Tooltip tooltip='Apply grouping'>
        <div
          ref={containerRef}
          className={classNames({
            Table__header__action: !triggerer,
            active: opened || filterIncludesParam(groupByColor) || filterIncludesParam(groupByStyle) || filterIncludesParam(groupByChart)
          })}
          onClick={evt => setOpened(!opened)}
        >
          {triggerer ?? (
            <UI.Icon
              i='layers'
              className={classNames({
                Table__header__action__icon: true,
              })}
            />
          )}
        </div>
      </UI.Tooltip>
      {opened && ReactDOM.createPortal((
        <div
          className='ContextBox__table__group__popup'
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
          <div className='ContextBox__table__group__popup__header'>
            <UI.Text overline bold>Apply grouping</UI.Text>
          </div>
          <div className='ContextBox__table__group__popup__body'>
            <div className='ContextBox__table__group__popup__body__row'>
              <UI.Text overline small>Group by color</UI.Text>
              <UI.Button
                size='tiny'
                type='primary'
                ghost={!filterIncludesParam(groupByColor)}
                onClick={evt => toggleGrouping('groupByColor', groupByColor)}
              >
                {filterIncludesParam(groupByColor) ? 'Remove' : 'Apply'}
              </UI.Button>
            </div>
            <UI.Line />
            <div className='ContextBox__table__group__popup__body__row'>
              <UI.Text overline small>Group by style</UI.Text>
              <UI.Button
                size='tiny'
                type='primary'
                ghost={!filterIncludesParam(groupByStyle)}
                onClick={evt => toggleGrouping('groupByStyle', groupByStyle)}
              >
                {filterIncludesParam(groupByStyle) ? 'Remove' : 'Apply'}
              </UI.Button>
            </div>
            <UI.Line />
            <div className='ContextBox__table__group__popup__body__row'>
              <UI.Text overline small>Divide into charts</UI.Text>
              <UI.Button
                size='tiny'
                type='primary'
                ghost={!filterIncludesParam(groupByChart)}
                onClick={evt => toggleGrouping('groupByChart', groupByChart)}
              >
                {filterIncludesParam(groupByChart) ? 'Remove' : 'Apply'}
              </UI.Button>
            </div>
          </div>
        </div>
      ), portalRef.current)}
    </>
  );
}

ColumnGroupPopup.propTypes = {
};

export default ColumnGroupPopup;