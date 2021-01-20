import './BarSearch.less';

import React, { useState, useRef } from 'react';
import UI from '../../../../../ui';

function BarSearch(props) {
  let valueRef = useRef('');
  let [value, setValue] = useState('');

  function onChange(evt) {
    const { value } = evt.target;
    valueRef.current = value;
    setValue(value);
  }

  function submit() {
    if (props.handleSearch) {
      props.handleSearch(valueRef.current);
    }
  }

  return (
    <div className='ContextTableBar__item__wrapper'>
      <UI.Input
        className='BarSearch'
        placeholder='Search in runs...'
        onChange={onChange}
        value={value}
        tabIndex={3}
        onKeyPress={(evt) => {
          if (evt.charCode === 13) {
            submit();
          }
        }}
      />
    </div>
  );
}

export default BarSearch;
