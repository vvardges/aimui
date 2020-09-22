import React, { useState, useRef, useEffect } from 'react';
import UI from '../../../../../../../ui';
import PropTypes from 'prop-types';
import { classNames } from '../../../../../../../utils';

function GroupByChart(props) {
  let [value, setValue] = useState('');
  let [opened, setOpened] = useState(false);

  const { groupByChart, setContextFilter } = props;

  let popupRef = useRef();

  useEffect(() => {
    if (opened && popupRef.current) {
      popupRef.current.focus();
    }
  }, [opened])

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
              }, 200);
            }
          }}
        >
          <div className='ControlsSidebar__item__popup__header'>
            <UI.Text overline bold>Select fields to divide into charts</UI.Text>
          </div>
          <div className='ControlsSidebar__item__popup__body'>
            <UI.Input
              size='small'
              placeholder='Type field names for grouping'
              value={value}
              onChange={evt => setValue(evt.target.value)}
              onKeyPress={evt => {
                if (evt.charCode === 13) {
                  if (value.trim() && !groupByChart.includes(value.trim())) {
                    setContextFilter({
                      groupByChart: groupByChart.concat([value.trim()])
                    });
                  }
                  setValue('');
                  return false;
                }
              }}
            />
            {groupByChart.length > 0 && (
              <div className='ControlsSidebar__item__popup__body__fields'>
                {groupByChart.map(field => (
                  <UI.Button
                    key={field}
                    size='tiny'
                    className='ControlsSidebar__item__popup__body__field'
                    iconRight={
                      <UI.Icon
                        i='close'
                        onClick={evt => props.setContextFilter({
                          groupByChart: groupByChart.filter(elem => elem !== field)
                        })}
                      />
                    }
                  >
                    {field}
                  </UI.Button>
                ))}
              </div>
            )}
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