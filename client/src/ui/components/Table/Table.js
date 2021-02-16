import './Table.less';

import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { classNames } from '../../../utils';
import UI from '../..';

function Table(props) {
  const columns =
    !!props.excludedFields && props.excludedFields.length
      ? props.columns.filter((c) => props.excludedFields.indexOf(c.key) === -1)
      : props.columns;

  let leftCols =
    props.columnsOrder?.left?.filter(
      (colKey) => columns.findIndex((col) => colKey === col.key) > -1,
    ) ?? columns.filter((col) => col.pin === 'left').map((col) => col.key);

  let midCols =
    props.columnsOrder?.middle?.filter(
      (colKey) => columns.findIndex((col) => colKey === col.key) > -1,
    ) ??
    columns
      .filter((col) => col.pin !== 'left' && col.pin !== 'right')
      .map((col) => col.key);

  let rightCols =
    props.columnsOrder?.right?.filter(
      (colKey) => columns.findIndex((col) => colKey === col.key) > -1,
    ) ?? columns.filter((col) => col.pin === 'right').map((col) => col.key);

  let [expanded, setExpanded] = useState({});

  let prevExpanded = useRef(props.expanded);

  const leftPane = columns
    .filter((col) => leftCols.includes(col.key))
    .sort((a, b) => leftCols.indexOf(a.key) - leftCols.indexOf(b.key));
  const middlePane = columns
    .filter((col) => midCols.includes(col.key))
    .sort((a, b) => midCols.indexOf(a.key) - midCols.indexOf(b.key));
  const rightPane = columns
    .filter((col) => rightCols.includes(col.key))
    .sort((a, b) => rightCols.indexOf(a.key) - rightCols.indexOf(b.key));
  const sortedColumns = [...leftPane, ...middlePane, ...rightPane];

  useEffect(() => {
    if (props.expanded && props.groups) {
      for (let groupKey in props.expanded) {
        if (
          props.expanded[groupKey] &&
          prevExpanded.current[groupKey] !== props.expanded[groupKey]
        ) {
          setExpanded((exp) => ({
            ...exp,
            [groupKey]: true,
          }));
        }
      }
    }
    prevExpanded.current = props.expanded;
  }, [props.expanded]);

  function expand(groupKey) {
    if (groupKey === 'expand_all') {
      let groupsForExpansion = {};
      for (let key in props.data) {
        groupsForExpansion[key] = true;
        prevExpanded.current[key] = true;
      }
      setExpanded({
        ...expanded,
        ...groupsForExpansion,
      });
    } else if (groupKey === 'collapse_all') {
      for (let key in props.data) {
        prevExpanded.current[key] = false;
      }
      setExpanded({});
    } else {
      prevExpanded.current[groupKey] = !expanded[groupKey];
      setExpanded({
        ...expanded,
        [groupKey]: !expanded[groupKey],
      });
    }
  }

  function togglePin(colKey, side) {
    const columnsOrderClone = _.cloneDeep(props.columnsOrder);
    if (side === 'left') {
      if (columnsOrderClone.left.includes(colKey)) {
        columnsOrderClone.left.splice(
          columnsOrderClone.left.indexOf(colKey),
          1,
        );
        columnsOrderClone.middle.unshift(colKey);
      } else {
        if (columnsOrderClone.right.includes(colKey)) {
          columnsOrderClone.right.splice(
            columnsOrderClone.right.indexOf(colKey),
            1,
          );
        } else {
          columnsOrderClone.middle.splice(
            columnsOrderClone.middle.indexOf(colKey),
            1,
          );
        }
        columnsOrderClone.left.push(colKey);
      }
    } else if (side === 'right') {
      if (columnsOrderClone.right.includes(colKey)) {
        columnsOrderClone.right.splice(
          columnsOrderClone.right.indexOf(colKey),
          1,
        );
        columnsOrderClone.middle.unshift(colKey);
      } else {
        if (columnsOrderClone.left.includes(colKey)) {
          columnsOrderClone.left.splice(
            columnsOrderClone.left.indexOf(colKey),
            1,
          );
        } else {
          columnsOrderClone.middle.splice(
            columnsOrderClone.middle.indexOf(colKey),
            1,
          );
        }
        columnsOrderClone.right.push(colKey);
      }
    } else {
      if (columnsOrderClone.left.includes(colKey)) {
        columnsOrderClone.left.splice(
          columnsOrderClone.left.indexOf(colKey),
          1,
        );
      }
      if (columnsOrderClone.right.includes(colKey)) {
        columnsOrderClone.right.splice(
          columnsOrderClone.right.indexOf(colKey),
          1,
        );
      }
      columnsOrderClone.middle.unshift(colKey);
    }
    props.updateColumns(columnsOrderClone);
  }

  return (
    <div
      className={classNames({
        Table__container: true,
        [`Table__container--${props.rowHeightMode}`]: true,
      })}
    >
      <div
        className={classNames({
          Table: true,
          'Table--grouped': props.groups,
        })}
      >
        {(props.groups || leftPane.length > 0) && (
          <div className='Table__pane Table__pane--left'>
            {props.groups && (
              <ConfigColumn
                data={props.data}
                expanded={expanded}
                expand={expand}
              />
            )}
            {leftPane.map((col, index) => (
              <Column
                key={col.key}
                topHeader={props.topHeader}
                showTopHeaderContent={
                  props.topHeader &&
                  sortedColumns[index - 1]?.topHeader !== col.topHeader
                }
                showTopHeaderBorder={
                  props.topHeader &&
                  sortedColumns[index + 1]?.topHeader !== col.topHeader
                }
                col={col}
                data={props.data}
                groups={props.groups}
                expanded={expanded}
                expand={expand}
                togglePin={togglePin}
                pinnedTo='left'
              />
            ))}
          </div>
        )}
        <div className='Table__pane Table__pane--middle'>
          {middlePane.map((col, index) => (
            <Column
              key={col.key}
              topHeader={props.topHeader}
              showTopHeaderContent={
                props.topHeader &&
                sortedColumns[(leftPane ? leftPane.length : 0) + index - 1]
                  ?.topHeader !== col.topHeader
              }
              showTopHeaderBorder={
                props.topHeader &&
                sortedColumns[(leftPane ? leftPane.length : 0) + index + 1]
                  ?.topHeader !== col.topHeader
              }
              col={col}
              data={props.data}
              groups={props.groups}
              expanded={expanded}
              expand={expand}
              togglePin={togglePin}
              pinnedTo={null}
            />
          ))}
        </div>
        {rightPane.length > 0 && (
          <div className='Table__pane Table__pane--right'>
            {rightPane.map((col, index) => (
              <Column
                key={col.key}
                topHeader={props.topHeader}
                showTopHeaderContent={
                  props.topHeader &&
                  sortedColumns[
                    (leftPane ? leftPane.length : 0) +
                      middlePane.length +
                      index -
                      1
                  ]?.topHeader !== col.topHeader
                }
                showTopHeaderBorder={
                  props.topHeader &&
                  sortedColumns[
                    (leftPane ? leftPane.length : 0) +
                      middlePane.length +
                      index +
                      1
                  ]?.topHeader !== col.topHeader
                }
                col={col}
                data={props.data}
                groups={props.groups}
                expanded={expanded}
                expand={expand}
                togglePin={togglePin}
                pinnedTo='right'
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

Table.defaultProps = {
  excludedFields: [],
  rowHeightMode: 'medium',
};

Table.propTypes = {
  excludedFields: PropTypes.array,
  rowHeightMode: PropTypes.string,
};

function Column({
  topHeader,
  showTopHeaderContent,
  showTopHeaderBorder,
  col,
  data,
  groups,
  expanded,
  expand,
  togglePin,
  pinnedTo,
}) {
  return (
    <div className='Table__column'>
      {topHeader && (
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
      )}
      <div
        className='Table__cell Table__cell--header'
        style={{
          minWidth: col.minWidth,
        }}
      >
        {col.content}
        <UI.Popover
          target={<UI.Icon i='more_vert' scale={1} />}
          targetClassName='Table__action'
          tooltip='Column actions'
          content={(opened, setOpened) => (
            <div className='Table__action__popup__body'>
              {(pinnedTo === 'left' || pinnedTo === 'right') && (
                <div
                  className='Table__action__popup__item'
                  onClick={(evt) => {
                    togglePin(col.key, null);
                    setOpened(false);
                  }}
                >
                  <UI.Text small>Unpin</UI.Text>
                </div>
              )}
              {pinnedTo !== 'left' && (
                <div
                  className='Table__action__popup__item'
                  onClick={(evt) => {
                    togglePin(col.key, 'left');
                    setOpened(false);
                  }}
                >
                  <UI.Text small>Pin to left</UI.Text>
                </div>
              )}
              {pinnedTo !== 'right' && (
                <div
                  className='Table__action__popup__item'
                  onClick={(evt) => {
                    togglePin(col.key, 'right');
                    setOpened(false);
                  }}
                >
                  <UI.Text small>Pin to right</UI.Text>
                </div>
              )}
            </div>
          )}
          popupClassName='Table__action__popup'
        />
      </div>
      {groups
        ? Object.keys(data).map((groupKey) => (
          <div key={groupKey} className='Table__group'>
            <Cell
              col={col}
              item={
                typeof data[groupKey].data[col.key] === 'object' &&
                  data[groupKey].data[col.key].expandable
                  ? {
                    ...data[groupKey].data[col.key],
                    props: {
                      ...data[groupKey].data[col.key]?.props,
                      onClick: (e) => expand(groupKey),
                    },
                  }
                  : data[groupKey].data[col.key]
              }
              className={classNames({
                Table__group__header__cell: true,
                expanded: expanded[groupKey],
                expandable:
                    typeof data[groupKey].data[col.key] === 'object' &&
                    data[groupKey].data[col.key].expandable,
              })}
            />
            {expanded[groupKey] &&
                data[groupKey].items.map((item, i) => (
                  <Cell key={col.key + i} col={col} item={item[col.key]} />
                ))}
          </div>
        ))
        : data.map((item, i) => (
          <Cell key={col.key + i} col={col} item={item[col.key]} />
        ))}
    </div>
  );
}

function Cell({ item, className, isConfigColumn }) {
  return (
    <div
      className={classNames({
        Table__cell: true,
        [`${typeof item === 'object' && item.className}`]: true,
        [className]: !!className,
        Table__group__config__column__cell: isConfigColumn,
        clickable: typeof item === 'object' && !!item.props?.onClick,
      })}
      style={{
        cursor:
          typeof item === 'object' && item.props?.onClick
            ? 'pointer'
            : 'inherit',
        ...(typeof item === 'object' &&
          item.hasOwnProperty('style') &&
          item.style),
      }}
      {...(typeof item === 'object' && item.props)}
    >
      {isConfigColumn
        ? ''
        : typeof item === 'object' && item.hasOwnProperty('content')
          ? item.content
          : item ?? '-'}
    </div>
  );
}

function ConfigColumn({ data, expand, expanded }) {
  return (
    <div className='Table__column'>
      <div className='Table__cell Table__cell--header Table__cell--topHeader'>
        <UI.Text>Groups</UI.Text>
      </div>
      <div className='Table__cell Table__cell--header'>
        <UI.Text small>Config</UI.Text>
      </div>
      {Object.keys(data).map((groupKey) => (
        <div key={groupKey} className='Table__group'>
          <div
            className={classNames({
              Table__group__config__cell: true,
              expanded: expanded[groupKey],
            })}
          >
            <GroupConfig
              config={data[groupKey].config}
              expand={expand}
              expanded={expanded}
              groupKeys={Object.keys(data)}
              groupKey={groupKey}
            />
          </div>
          {expanded[groupKey] &&
            data[groupKey].items.map((item, i) => (
              <Cell key={i} isConfigColumn />
            ))}
        </div>
      ))}
    </div>
  );
}

function GroupConfig({ config, expand, expanded, groupKeys, groupKey }) {
  return (
    <>
      <UI.Tooltip
        tooltip={expanded[groupKey] ? 'Collapse group' : 'Expand group'}
      >
        <div className='Table__action' onClick={(evt) => expand(groupKey)}>
          <UI.Icon
            i={expanded[groupKey] ? 'unfold_less' : 'unfold_more'}
            scale={1}
          />
        </div>
      </UI.Tooltip>
      {config}
      <UI.Popover
        target={<UI.Icon i='more_horiz' scale={1} />}
        targetClassName='Table__action'
        tooltip='More actions'
        content={(opened, setOpened) => (
          <div className='Table__action__popup__body'>
            <div
              className='Table__action__popup__item'
              onClick={(evt) => {
                expand(groupKey);
                setOpened(false);
              }}
            >
              <UI.Text small>
                {expanded[groupKey] ? 'Collapse group' : 'Expand group'}
              </UI.Text>
            </div>
            {(expanded[groupKey] ||
              groupKeys.some((key) => !!expanded[key])) && (
              <div
                className='Table__action__popup__item'
                onClick={(evt) => {
                  expand('collapse_all');
                  setOpened(false);
                }}
              >
                <UI.Text small>Collapse all</UI.Text>
              </div>
            )}
            {(!expanded[groupKey] ||
              groupKeys.some((key) => !expanded[key])) && (
              <div
                className='Table__action__popup__item'
                onClick={(evt) => {
                  expand('expand_all');
                  setOpened(false);
                }}
              >
                <UI.Text small>Expand all</UI.Text>
              </div>
            )}
          </div>
        )}
        popupClassName='Table__action__popup'
      />
    </>
  );
}

export default Table;
