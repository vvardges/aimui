import React, { useState, useRef, useEffect } from 'react';
import UI from '../../../../../../../ui';
import PropTypes from 'prop-types';
import { classNames } from '../../../../../../../utils';
import { getGroupingOptions } from '../../helpers';
import { HubMainScreenModel } from '../../../../models/HubMainScreenModel';

function GroupByStyle(props) {
  let [opened, setOpened] = useState(false);

  const { groupByStyle, seed } = props;

  let popupRef = useRef();
  let dropdownRef = useRef();

  let { setContextFilter, setSeed } = HubMainScreenModel.emitters;

  let {
    getAllParamsPaths,
    getAllContextKeys,
    isExploreMetricsModeEnabled,
    isExploreParamsModeEnabled,
  } = HubMainScreenModel.helpers;

  useEffect(() => {
    if (opened) {
      popupRef.current?.focus();
      dropdownRef.current?.selectRef?.current?.focus();
    }
  }, [opened]);

  const options = getGroupingOptions(
    getAllParamsPaths(),
    getAllContextKeys(),
    isExploreMetricsModeEnabled(),
    isExploreParamsModeEnabled(),
  );

  return (
    <div className='ControlsSidebar__item__wrapper'>
      <UI.Tooltip
        tooltip={
          groupByStyle.length > 0
            ? `Styled by ${groupByStyle.length} field${
                groupByStyle.length > 1 ? 's' : ''
              }`
            : 'Group by stroke style'
        }
      >
        <div
          className={classNames({
            ControlsSidebar__item: true,
            active: opened || groupByStyle.length > 0,
          })}
          onClick={(evt) => setOpened(!opened)}
        >
          <UI.Icon i='line_style' scale={1.7} />
        </div>
      </UI.Tooltip>
      {opened && (
        <div
          className='ControlsSidebar__item__popup'
          tabIndex={0}
          ref={popupRef}
          onBlur={(evt) => {
            const currentTarget = evt.currentTarget;
            if (opened) {
              window.setTimeout(() => {
                if (!currentTarget.contains(document.activeElement)) {
                  setOpened(false);
                }
              }, 100);
            }
          }}
        >
          <div className='ControlsSidebar__item__popup__header'>
            <UI.Text overline bold>
              Select fields for grouping by stroke style
            </UI.Text>
          </div>
          <div className='ControlsSidebar__item__popup__body'>
            <UI.Dropdown
              className='ControlsSidebar__groupingDropdown'
              options={options}
              inline={false}
              formatGroupLabel={(data) => (
                <div>
                  <span>{data.label}</span>
                  <span>{data.options.length}</span>
                </div>
              )}
              defaultValue={groupByStyle.map((field) => ({
                value: field,
                label: field.startsWith('params.') ? field.substring(7) : field,
              }))}
              ref={dropdownRef}
              onChange={(data) => {
                const selectedItems = !!data ? data : [];
                const values = selectedItems
                  .filter((i) => !!i.value)
                  .map((i) => i.value.trim());
                setContextFilter({
                  groupByStyle: values,
                });
              }}
              isOpen
              multi
            />
            <UI.Line />
            <div className='ControlsSidebar__item__popup__body__action'>
              <UI.Button
                size='tiny'
                disabled={groupByStyle.length === 0}
                onClick={(evt) => setSeed(seed + 1, 'style')}
              >
                Shuffle groups stroke styles
              </UI.Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

GroupByStyle.propTypes = {
  groupByStyle: PropTypes.arrayOf(PropTypes.string),
  seed: PropTypes.number,
};

export default GroupByStyle;
