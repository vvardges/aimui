import './Table.less';

import React, { Fragment, useRef, useState, useEffect } from 'react';
import { classNames } from '../../../utils';
import UI from '../..';

function Table(props) {
  let [expanded, setExpanded] = useState({});
  let prevExpanded = useRef(props.expanded);

  useEffect(() => {
    if (props.expanded && props.groups) {
      for (let groupKey in props.expanded) {
        if (props.expanded[groupKey] && prevExpanded.current[groupKey] !== props.expanded[groupKey]) {
          setExpanded(exp => ({
            ...exp,
            [groupKey]: true
          }));
        }
      }
    }
    prevExpanded.current = props.expanded;
  }, [props.expanded]);
  
  const leftPane = props.columns.some(col => col.stick === 'left') ? props.columns.filter(col => col.stick === 'left') : null;
  const middlePane = props.columns.filter(col => !col.hasOwnProperty('stick'));
  const rightPane = props.columns.some(col => col.stick === 'right') ? props.columns.filter(col => col.stick === 'right') : null;

  function expand(groupKey) {
    prevExpanded.current[groupKey] = !expanded[groupKey];
    setExpanded({
      ...expanded,
      [groupKey]: !expanded[groupKey]
    });
  }

  return (
    <div className='Table__container'>
      <div className={classNames({
        Table: true,
        'Table--grouped': props.groups
      })}>
        {
          leftPane && (
            <div className='Table__pane Table__pane--left'>
              {
                leftPane.map((col, index) => (
                  <Column
                    key={col.key}
                    topHeader={props.topHeader}
                    showTopHeaderContent={props.topHeader && props.columns[index - 1]?.topHeader !== col.topHeader}
                    showTopHeaderBorder={props.topHeader && props.columns[index + 1]?.topHeader !== col.topHeader}
                    col={col}
                    data={props.data}
                    groups={props.groups}
                    expanded={expanded}
                    expand={expand}
                    showGroupConfig={index === 0}
                  />
                ))
              }
            </div>
          )
        }
        <div className='Table__pane Table__pane--middle'>
          {
            middlePane.map((col, index) => (
              <Column
                key={col.key}
                topHeader={props.topHeader}
                showTopHeaderContent={
                  props.topHeader && props.columns[(leftPane ? leftPane.length : 0) + index - 1]?.topHeader !== col.topHeader
                }
                showTopHeaderBorder={
                  props.topHeader && props.columns[(leftPane ? leftPane.length : 0) + index + 1]?.topHeader !== col.topHeader
                }
                col={col}
                data={props.data}
                groups={props.groups}
                expanded={expanded}
                expand={expand}
                showGroupConfig={
                  index === 0 && props.columns.filter(col => col.stick === 'left').length === 0
                }
              />
            ))
          }
        </div>
        {
          rightPane && (
            <div className='Table__pane Table__pane--right'>
              {
                rightPane.map((col, index) => (
                  <Column
                    key={col.key}
                    topHeader={props.topHeader}
                    showTopHeaderContent={
                      props.topHeader && props.columns[(leftPane ? leftPane.length : 0) + middlePane.length + index - 1]?.topHeader !== col.topHeader
                    }
                    showTopHeaderBorder={
                      props.topHeader && props.columns[(leftPane ? leftPane.length : 0) + middlePane.length + index + 1]?.topHeader !== col.topHeader
                    }
                    col={col}
                    data={props.data}
                    groups={props.groups}
                    expanded={expanded}
                    expand={expand}
                    showGroupConfig={
                      index === 0 && rightPane.length === props.columns.length
                    }
                  />
                ))
              }
            </div>
          )
        }
      </div>
    </div>
  );
}

function Column({
  topHeader,
  showTopHeaderContent,
  showTopHeaderBorder,
  col,
  data,
  groups,
  expanded,
  expand,
  showGroupConfig
}) {
  return (
    <div className='Table__column'>
      {
        topHeader && (
          <div
            className='Table__cell Table__cell--header Table__cell--topHeader'
            style={{
              minWidth: col.minWidth,
              borderRight: showTopHeaderBorder ? '' : 'none',
            }}
          >
            {showTopHeaderContent && col.topHeader && (
              <UI.Text>{col.topHeader}</UI.Text>
            )}
          </div>
        )
      }
      <div
        className='Table__cell Table__cell--header'
        style={{
          minWidth: col.minWidth,
        }}
      >
        {col.content}
      </div>
      {
        groups ? Object.keys(data).map(groupKey => (
          <div key={groupKey} className='Table__group'>
            <div
              className={classNames({
                Table__group__config__cell: true,
                expanded: expanded[groupKey]
              })}
            >
              {showGroupConfig && (
                <>
                  <div
                    className='Table__group__expand__toggle'
                    onClick={e => expand(groupKey)}
                  >
                    <UI.Icon
                      i={expanded[groupKey] ? 'unfold_less' : 'unfold_more'}
                      scale={1}
                      className='Table__group__expand__toggle__icon'
                    />
                  </div>
                  {data[groupKey].config}
                </>
              )}
            </div>
            <Cell
              col={col}
              item={typeof data[groupKey].data[col.key] === 'object' && data[groupKey].data[col.key].expandable ? {
                ...data[groupKey].data[col.key],
                props: {
                  ...data[groupKey].data[col.key]?.props,
                  onClick: e => expand(groupKey)
                }
              } : data[groupKey].data[col.key]}
              className={classNames({
                Table__group__header__cell: true,
                expanded: expanded[groupKey]
              })}
            />
            {
              expanded[groupKey] && data[groupKey].items.map((item, i) => (
                <Cell key={col.key + i} col={col} item={item[col.key]} />
              ))
            }
          </div>
        )) : data.map((item, i) => (
          <Cell key={col.key + i} col={col} item={item[col.key]} />
        ))
      }
    </div>
  );
}

function Cell({ item, className }) {
  return (
    <div
      className={classNames({
        Table__cell: true,
        [`${typeof item === 'object' && item.className}`]: true,
        [className]: !!className,
        clickable: typeof item === 'object' && !!item.props?.onClick,
      })}
      style={{
        cursor: typeof item === 'object' && item.props?.onClick ? 'pointer' : 'inherit',
        ...typeof item === 'object' && item.hasOwnProperty('style') && item.style
      }}
      {...typeof item === 'object' && item.props}
    >
      {typeof item === 'object' && item.hasOwnProperty('content') ? (
        item.content
      ) : item ?? '-'}
    </div>
  );
}

export default Table;