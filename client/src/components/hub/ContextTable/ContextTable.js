import './ContextTable.less';

import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';

import UI from '../../../ui';
import Bar from './components/Bar/Bar';
import { classNames } from '../../../utils';

function ContextTable(props) {
  let [excludedFields, setExcludedFields] = useState([]);

  let contextTableRef = useRef();

  const height = contextTableRef.current?.getBoundingClientRect()?.height;

  return (
    <div
      className={classNames({
        ContextTable: true,
        'ContextTable--displayBar': true,
      })}
      ref={contextTableRef}
    >
      {props.displayBar &&
        <Bar
          excludedFields={excludedFields}
          setExcludedFields={setExcludedFields}
          tableHeight={height}
          searchFields={props.searchFields}
        />
      }
      <div className="ContextTable__table">
        <UI.Table
          excludedFields={excludedFields}
          {...props}
        />
      </div>
    </div>
  );
}

ContextTable.defaultProps = {
  displayBar: true,
};

ContextTable.propTypes = {
  displayBar: PropTypes.bool,
  searchFields: PropTypes.object,
};

export default ContextTable;