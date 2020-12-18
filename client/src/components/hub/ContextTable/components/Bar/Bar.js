import './Bar.less';

import React from 'react';
import PropTypes from 'prop-types';

import { classNames } from '../../../../../utils';
import BarFilter from '../BarFilter/BarFilter';

function Bar(props) {
  const itemMaxHeight = !!props.tableHeight ? props.tableHeight - 50 : null;

  return (
    <div
      className={classNames({
        ContextTableBar: true,
      })}
    >
      <div className="ContextTableBar__items ContextTableBar__items--left">
        <BarFilter
          excludedFields={props.excludedFields}
          setExcludedFields={props.setExcludedFields}
          maxHeight={itemMaxHeight}
          fields={props.searchFields}
        />
      </div>
      <div className="ContextTableBar__items ContextTableBar__items--right" />
    </div>
  );
}

Bar.defaultProps = {
  excludedFields: [],
  setExcludedFields: null,
  tableHeight: null,
};

Bar.propTypes = {
  excludedFields: PropTypes.array,
  setExcludedFields: PropTypes.func,
  tableHeight: PropTypes.number,
  searchFields: PropTypes.object,
};

export default Bar;