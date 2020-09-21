import './Table.less';

import React from 'react';

function Table(props) {
  return (
    <table className='Table' cellSpacing={0} cellPadding={0}>
      {props.children}
    </table>
  );
}

export default Table;