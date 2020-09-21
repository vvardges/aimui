import React, { useState, useRef, useEffect } from 'react';
import UI from '../../../../../../../ui';
import PropTypes from 'prop-types';
import { classNames } from '../../../../../../../utils';

function GroupByColor(props) {
  let [value, setValue] = useState('');
  let [opened, setOpened] = useState(false);

  const { groupByColor, setContextFilter } = props;

  let popupRef = useRef();

  useEffect(() => {
    if (opened && popupRef.current) {
      popupRef.current.focus();
    }
  }, [opened]);

  return (
    <div className='ControlsSidebar__item__wrapper'>
      <div
        className={classNames({
          ControlsSidebar__item: true,
          active: opened || groupByColor.length > 0
        })}
        onClick={evt => setOpened(!opened)}
        title={groupByColor.length > 0 ? `Colored by ${groupByColor.length} field${groupByColor.length > 1 ? 's' : ''}` : 'Group by color'}
      >
        <UI.Icon i='palette' scale={1.7} />
      </div>
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
            <UI.Text overline bold>Select fields for grouping by color</UI.Text>
          </div>
          <div className='ControlsSidebar__item__popup__body'>
            <UI.Input
              size='small'
              placeholder='Type field names for grouping'
              value={value}
              onChange={evt => setValue(evt.target.value)}
              onKeyPress={evt => {
                if (evt.charCode === 13) {
                  if (value.trim() && !groupByColor.includes(value.trim())) {
                    setContextFilter({
                      groupByColor: groupByColor.concat([value.trim()])
                    });
                  }
                  setValue('');
                  return false;
                }
              }}
            />
            {groupByColor.length > 0 && (
              <div className='ControlsSidebar__item__popup__body__fields'>
                {groupByColor.map(field => (
                  <UI.Button
                    key={field}
                    size='tiny'
                    className='ControlsSidebar__item__popup__body__field'
                    iconRight={
                      <UI.Icon
                        i='close'
                        onClick={evt => props.setContextFilter({
                          groupByColor: groupByColor.filter(elem => elem !== field)
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

GroupByColor.propTypes = {
  groupByColor: PropTypes.arrayOf(PropTypes.string),
  setContextFilter: PropTypes.func
};

export default GroupByColor;