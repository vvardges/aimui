import './ColumnGroupPopup.less';

import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import UI from '../../../../../../../ui';
import { classNames } from '../../../../../../../utils';

function ColumnGroupPopup(props) {
  let [opened, setOpened] = useState(false);

  const { contextFilter, setContextFilter, param } = props;
  const { groupByColor, groupByStyle, groupByChart } = contextFilter;

  let popupRef = useRef();

  useEffect(() => {
    if (opened && popupRef.current) {
      popupRef.current.focus();
    }
  }, [opened]);

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
      <div
        className={classNames({
          Table__header__action: true,
          active: opened || filterIncludesParam(groupByColor) || filterIncludesParam(groupByStyle) || filterIncludesParam(groupByChart)
        })}
        onClick={e => setOpened(!opened)}
      >
        <UI.Icon
          i='layers'
          className={classNames({
            Table__header__action__icon: true,
          })}
        />
      </div>
      {opened && (
        <div
          className='ContextBox__table__group__popup'
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
      )}
    </>
  );
}

ColumnGroupPopup.propTypes = {
};

export default ColumnGroupPopup;