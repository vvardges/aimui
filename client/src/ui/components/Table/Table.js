import './Table.less';

import React, { useRef, useState, useEffect } from 'react';
import { classNames } from '../../../utils';
import UI from '../..';
import { getItem, setItem } from '../../../services/storage';
import { TABLE_COLUMNS } from '../../../config';

function Table(props) {
  let columnsOrder = JSON.parse(getItem(TABLE_COLUMNS))?.[props.name];

  let [leftCols, setLeftCols] = useState(
    props.columns
      .filter((col) =>
        props.forcePinnedColumns?.hasOwnProperty(col.key)
          ? !!props.forcePinnedColumns?.[col.key]
          : columnsOrder?.left?.includes(col.key) ?? col.pin === 'left',
      )
      .map((col) => col.key),
  );
  let [rightCols, setRightCols] = useState(
    props.columns
      .filter(
        (col) => columnsOrder?.right?.includes(col.key) ?? col.pin === 'right',
      )
      .map((col) => col.key),
  );
  let [expanded, setExpanded] = useState({});

  let prevExpanded = useRef(props.expanded);

  const leftPane = props.columns.filter((col) => leftCols.includes(col.key));
  const middlePane = props.columns.filter(
    (col) => !leftCols.includes(col.key) && !rightCols.includes(col.key),
  );
  const rightPane = props.columns.filter((col) => rightCols.includes(col.key));
  const sortedColumns = [...leftPane, ...middlePane, ...rightPane];

  useEffect(() => {
    let tableColumns = JSON.parse(getItem(TABLE_COLUMNS)) ?? {};
    let middleCols = middlePane.map((col) => col.key);
    if (!tableColumns.hasOwnProperty(props.name)) {
      tableColumns[props.name] = {
        left: leftCols,
        middle: middleCols,
        right: rightCols,
        forcePinned: props.forcePinnedColumns,
      };
    } else {
      tableColumns[props.name].forcePinned = props.forcePinnedColumns;
    }
    setLeftCols(
      props.columns
        .filter((col) =>
          props.forcePinnedColumns?.hasOwnProperty(col.key)
            ? !!props.forcePinnedColumns?.[col.key]
            : tableColumns[props.name].left?.includes(col.key) ??
              col.pin === 'left',
        )
        .map((col) => col.key),
    );
    setItem(TABLE_COLUMNS, JSON.stringify(tableColumns));
  }, [props.forcePinnedColumns]);

  useEffect(() => {
    let tableColumns = JSON.parse(getItem(TABLE_COLUMNS)) ?? {};
    let middleCols = middlePane.map((col) => col.key);

    if (!tableColumns.hasOwnProperty(props.name)) {
      tableColumns[props.name] = {
        left: leftCols,
        middle: middleCols,
        right: rightCols,
        forcePinned: props.forcePinnedColumns,
      };
    } else {
      leftCols.forEach((col) => {
        if (!tableColumns[props.name].left.includes(col)) {
          tableColumns[props.name].left.push(col);
        }
      });

      middleCols.forEach((col) => {
        if (!tableColumns[props.name].middle.includes(col)) {
          tableColumns[props.name].middle.push(col);
        }
      });

      rightCols.forEach((col) => {
        if (!tableColumns[props.name].right.includes(col)) {
          tableColumns[props.name].right.push(col);
        }
      });

      tableColumns[props.name].left = tableColumns[props.name].left.filter(
        (col) => {
          return !middleCols.includes(col) && !rightCols.includes(col);
        },
      );

      tableColumns[props.name].middle = tableColumns[props.name].middle.filter(
        (col) => {
          return !leftCols.includes(col) && !rightCols.includes(col);
        },
      );

      tableColumns[props.name].right = tableColumns[props.name].right.filter(
        (col) => {
          return !leftCols.includes(col) && !middleCols.includes(col);
        },
      );
    }

    setItem(TABLE_COLUMNS, JSON.stringify(tableColumns));
  }, [leftCols, rightCols]);

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
    if (props?.forcePinnedColumns?.hasOwnProperty(colKey)) {
      props.updateForcePinnedColumns(colKey, null);
    }
    setTimeout(() => {
      if (side === 'left') {
        if (leftCols.includes(colKey)) {
          setLeftCols(leftCols.filter((key) => key !== colKey));
        } else {
          if (rightCols.includes(colKey)) {
            setRightCols(rightCols.filter((key) => key !== colKey));
          }
          setLeftCols([...leftCols, colKey]);
        }
      } else if (side === 'right') {
        if (rightCols.includes(colKey)) {
          setRightCols(rightCols.filter((key) => key !== colKey));
        } else {
          if (leftCols.includes(colKey)) {
            setLeftCols(leftCols.filter((key) => key !== colKey));
          }
          setRightCols([...rightCols, colKey]);
        }
      } else {
        setLeftCols(leftCols.filter((key) => key !== colKey));
        setRightCols(rightCols.filter((key) => key !== colKey));
      }
    });
  }

  return (
    <div className="Table__container">
      <div
        className={classNames({
          Table: true,
          'Table--grouped': props.groups,
        })}
      >
        {leftPane.length > 0 && (
          <div className="Table__pane Table__pane--left">
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
                showGroupConfig={index === 0}
                togglePin={togglePin}
                pinnedTo="left"
              />
            ))}
          </div>
        )}
        <div className="Table__pane Table__pane--middle">
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
              showGroupConfig={index === 0 && leftCols.length === 0}
              togglePin={togglePin}
              pinnedTo={null}
            />
          ))}
        </div>
        {rightPane.length > 0 && (
          <div className="Table__pane Table__pane--right">
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
                showGroupConfig={
                  index === 0 && rightPane.length === props.columns.length
                }
                togglePin={togglePin}
                pinnedTo="right"
              />
            ))}
          </div>
        )}
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
  showGroupConfig,
  togglePin,
  pinnedTo,
}) {
  return (
    <div className="Table__column">
      {topHeader && (
        <div
          className="Table__cell Table__cell--header Table__cell--topHeader"
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
        className="Table__cell Table__cell--header"
        style={{
          minWidth: col.minWidth,
        }}
      >
        {col.content}
        <UI.Popover
          target={<UI.Icon i="more_vert" scale={1} />}
          targetClassName="Table__action"
          tooltip="Column actions"
          content={(opened, setOpened) => (
            <div className="Table__action__popup__body">
              {(pinnedTo === 'left' || pinnedTo === 'right') && (
                <div
                  className="Table__action__popup__item"
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
                  className="Table__action__popup__item"
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
                  className="Table__action__popup__item"
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
          popupClassName="Table__action__popup"
        />
      </div>
      {groups
        ? Object.keys(data).map((groupKey) => (
          <div key={groupKey} className="Table__group">
            <div
              className={classNames({
                Table__group__config__cell: true,
                expanded: expanded[groupKey],
              })}
            >
              {showGroupConfig && (
                <GroupConfig
                  config={data[groupKey].config}
                  expand={expand}
                  expanded={expanded}
                  groupKeys={Object.keys(data)}
                  groupKey={groupKey}
                />
              )}
            </div>
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
      {typeof item === 'object' && item.hasOwnProperty('content')
        ? item.content
        : item ?? '-'}
    </div>
  );
}

function GroupConfig({ config, expand, expanded, groupKeys, groupKey }) {
  return (
    <>
      <UI.Tooltip
        tooltip={expanded[groupKey] ? 'Collapse group' : 'Expand group'}
      >
        <div className="Table__action" onClick={(evt) => expand(groupKey)}>
          <UI.Icon
            i={expanded[groupKey] ? 'unfold_less' : 'unfold_more'}
            scale={1}
          />
        </div>
      </UI.Tooltip>
      {config}
      <UI.Popover
        target={<UI.Icon i="more_horiz" scale={1} />}
        targetClassName="Table__action"
        tooltip="More actions"
        content={(opened, setOpened) => (
          <div className="Table__action__popup__body">
            <div
              className="Table__action__popup__item"
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
                className="Table__action__popup__item"
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
                className="Table__action__popup__item"
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
        popupClassName="Table__action__popup"
      />
    </>
  );
}

export default Table;
