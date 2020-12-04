import React, { useState, useRef, useEffect, useContext } from 'react';
import UI from '../../../../../../../ui';
import PropTypes from 'prop-types';
import { classNames } from '../../../../../../../utils';
import HubMainScreenContext from '../../../../HubMainScreenContext/HubMainScreenContext';
import { getGroupingOptions } from '../../helpers';

function GroupByChart(props) {
  let [opened, setOpened] = useState(false);

  const { groupByChart, setContextFilter } = props;

  let popupRef = useRef();
  let dropdownRef = useRef();
  let {
    getAllParamsPaths, getAllContextKeys,
    enableExploreMetricsMode, enableExploreParamsMode,
  } = useContext(HubMainScreenContext);

  useEffect(() => {
    if (opened) {
      popupRef.current?.focus();
      dropdownRef.current?.selectRef?.current?.focus();
    }
  }, [opened]);

  const options = getGroupingOptions(getAllParamsPaths(), getAllContextKeys(), enableExploreMetricsMode(), enableExploreParamsMode());

  return (
    <div className='ControlsSidebar__item__wrapper'>
      <UI.Tooltip
        tooltip={groupByChart.length > 0 ? `Divided into charts by ${groupByChart.length} field${groupByChart.length > 1 ? 's' : ''}` : 'Divide into charts'}
      >
        <div
          className={classNames({
            ControlsSidebar__item: true,
            active: opened || groupByChart.length > 0
          })}
          onClick={evt => setOpened(!opened)}
        >
          <UI.Icon i='dashboard' scale={1.7} />
        </div>
      </UI.Tooltip>
      {opened && (
        <div
          className='ControlsSidebar__item__popup'
          tabIndex={0}
          ref={popupRef}
          onBlur={evt => {
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
            <UI.Text overline bold>Select fields to divide into charts</UI.Text>
          </div>
          <div className='ControlsSidebar__item__popup__body'>
            <UI.Dropdown
              className='ControlsSidebar__groupingDropdown'
              options={options}
              inline={false}
              formatGroupLabel={data => (
                <div>
                  <span>{data.label}</span>
                  <span>{data.options.length}</span>
                </div>
              )}
              defaultValue={groupByChart.map(field => ({ value: field, label: field.startsWith('params.') ? field.substring(7) : field }))}
              ref={dropdownRef}
              onChange={(data) => {
                const selectedItems = !!data ? data : [];
                const values = selectedItems.filter(i => !!i.value).map(i => i.value.trim());
                setContextFilter({
                  groupByChart: values,
                });
              }}
              isOpen
              multi
            />
          </div>
        </div>
      )}
    </div>
  );
}

GroupByChart.propTypes = {
  groupByChart: PropTypes.arrayOf(PropTypes.string),
  setContextFilter: PropTypes.func
};

export default GroupByChart;