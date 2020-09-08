import React, { useState, useRef, useEffect } from 'react';
import UI from '../../../../../../../ui';
import PropTypes from 'prop-types';
import { classNames } from '../../../../../../../utils';

function GroupByStyle(props) {
  let [value, setValue] = useState('');
  let [opened, setOpened] = useState(false);

  const { groupByStyle, setContextFilter } = props;

  let popupRef = useRef();

  useEffect(() => {
    if (opened && popupRef.current) {
      popupRef.current.focus();
    }
  }, [opened])

  return (
    <div className='ControlsSidebar__item__wrapper'>
      <div
        className={classNames({
          ControlsSidebar__item: true,
          active: opened || groupByStyle.length > 0
        })}
        onClick={evt => setOpened(!opened)}
        title={groupByStyle.length > 0 ? `Styled by ${groupByStyle.length} field${groupByStyle.length > 1 ? 's' : ''}` : 'Group by style'}
      >
        <UI.Icon i='line_style' scale={1.7} />
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
            <UI.Text overline bold>Select fields for grouping by style</UI.Text>
          </div>
          <div className='ControlsSidebar__item__popup__body'>
            <UI.Input
              size='small'
              placeholder='Type field names for grouping'
              value={value}
              onChange={evt => setValue(evt.target.value)}
              onKeyPress={evt => {
                if (evt.charCode === 13) {
                  if (value.trim() && !groupByStyle.includes(value.trim())) {
                    setContextFilter({
                      groupByStyle: groupByStyle.concat([value.trim()])
                    });
                  }
                  setValue('');
                  return false;
                }
              }}
            />
            {groupByStyle.length > 0 && (
              <div className='ControlsSidebar__item__popup__body__fields'>
                {groupByStyle.map(field => (
                  <UI.Tag
                    key={field}
                    size='tiny'
                    className='ControlsSidebar__item__popup__body__field'
                    onRemove={evt => props.setContextFilter({
                      groupByStyle: groupByStyle.filter(elem => elem !== field)
                    })}
                  >
                    {field}
                  </UI.Tag>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

GroupByStyle.propTypes = {
  groupByStyle: PropTypes.arrayOf(PropTypes.string),
  setContextFilter: PropTypes.func
};

export default GroupByStyle;