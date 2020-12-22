import './ContextTable.less';

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import UI from '../../../ui';
import { classNames } from '../../../utils';
import BarFilter from './components/BarFilter/BarFilter';
import BarRowHeightSelect from './components/BarRowHeightSelect/BarRowHeightSelect';
import BarViewModes from '../BarViewModes/BarViewModes';
import { setItem, getItem } from '../../../services/storage';
import { CONTEXT_TABLE_CONFIG } from '../../../config';

function ContextTable(props) {
  const storageKey = CONTEXT_TABLE_CONFIG.replace('{name}', props.name);
  let storageVal;
  try {
    storageVal = getItem(storageKey);
    storageVal = JSON.parse(storageVal);
  } catch (e) {
    storageVal = {};
  }

  let [excludedFields, setExcludedFields] = useState(storageVal?.excludedFields ?? []);
  let [rowHeightMode, setRowHeightMode] = useState(storageVal?.rowHeightMode ?? 'medium');

  let contextTableRef = useRef();

  const height = contextTableRef.current?.getBoundingClientRect()?.height;
  const itemMaxHeight = !!height ? height - 50 : null;

  useEffect(() => {
    setItem(storageKey, JSON.stringify({
      rowHeightMode,
      excludedFields,
    }));
  }, [rowHeightMode, excludedFields]);

  return (
    <div
      className={classNames({
        ContextTable: true,
        'ContextTable--displayBar': true,
        [`ContextTable--${rowHeightMode}`]: true,
      })}
      ref={contextTableRef}
    >
      {props.displayBar && (
        <div
          className={classNames({
            ContextTableBar: true,
          })}
        >
          <div className='ContextTableBar__items ContextTableBar__items--left'>
            {props.displayViewModes &&
              <BarViewModes
                viewMode={props.viewMode}
                setViewMode={props.setViewMode}
              />
            }
            <BarFilter
              excludedFields={excludedFields}
              setExcludedFields={setExcludedFields}
              maxHeight={itemMaxHeight}
              fields={props.searchFields}
            />
            <BarRowHeightSelect
              rowHeightMode={rowHeightMode}
              setRowHeightMode={setRowHeightMode}
            />
          </div>
          <div className='ContextTableBar__items ContextTableBar__items--right' />
        </div>
      )}
      <div className='ContextTable__table'>
        <UI.Table
          excludedFields={excludedFields}
          rowHeightMode={rowHeightMode}
          {...props}
        />
      </div>
    </div>
  );
}

ContextTable.defaultProps = {
  displayBar: true,
  displayViewModes: false,
  viewMode: null,
  setViewMode: null,
};

ContextTable.propTypes = {
  displayBar: PropTypes.bool,
  searchFields: PropTypes.object,
  displayViewModes: PropTypes.bool,
  viewMode: PropTypes.string,
  setViewMode: PropTypes.func,
};

export default ContextTable;
