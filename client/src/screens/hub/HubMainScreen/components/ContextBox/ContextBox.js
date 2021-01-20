import './ContextBox.less';

import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Color from 'color';
import moment from 'moment';
import * as _ from 'lodash';
import ContentLoader from 'react-content-loader';

import {
  buildUrl,
  classNames,
  sortOnKeys,
  formatValue,
  roundValue,
} from '../../../../../utils';
import UI from '../../../../../ui';
import ContextTable from '../../../../../components/hub/ContextTable/ContextTable';
import { HUB_PROJECT_EXPERIMENT } from '../../../../../constants/screens';
import ColumnGroupPopup from './components/ColumnGroupPopup/ColumnGroupPopup';
import GroupConfigPopup from './components/GroupConfigPopup/GroupConfigPopup';
import { getItem } from '../../../../../services/storage';
import { TABLE_COLUMNS } from '../../../../../config';
import { HubMainScreenModel } from '../../models/HubMainScreenModel';

function ContextBox(props) {
  let [forcePinnedColumns, setForcePinnedColumns] = useState(
    JSON.parse(getItem(TABLE_COLUMNS))?.context?.forcePinned,
  );
  let [searchFields, setSearchFields] = useState({
    metrics: {},
    params: {},
  });
  let paramKeys = useRef();

  let {
    runs,
    traceList,
    chart,
    contextFilter,
    sortFields,
  } = HubMainScreenModel.useHubMainScreenState([
    HubMainScreenModel.events.SET_RUNS_STATE,
    HubMainScreenModel.events.SET_TRACE_LIST,
    HubMainScreenModel.events.SET_CHART_FOCUSED_ACTIVE_STATE,
    HubMainScreenModel.events.SET_SORT_FIELDS,
  ]);

  let {
    setChartFocusedState,
    setChartFocusedActiveState,
    setContextFilter,
    setSortFields,
  } = HubMainScreenModel.emitters;

  let {
    getTraceData,
    getMetricStepDataByStepIdx,
    contextToHash,
    traceToHash,
    getMetricColor,
    isExploreParamsModeEnabled,
    isExploreMetricsModeEnabled,
    getAllParamsPaths,
    getClosestStepData,
    getAllMetrics,
  } = HubMainScreenModel.helpers;

  function updateForcePinnedColumns(columnKey, value) {
    setForcePinnedColumns((fpc) => {
      let newCols = {};
      for (let key in fpc) {
        if (key === columnKey) {
          if (value !== undefined) {
            newCols[key] = value;
          }
        } else {
          newCols[key] = fpc[key];
        }
      }
      return newCols;
    });
  }

  function handleRowMove(runHash, metricName, traceContext) {
    const focusedCircle = HubMainScreenModel.getState().chart.focused.circle;
    const focusedMetric = HubMainScreenModel.getState().chart.focused.metric;

    if (focusedCircle.active) {
      return;
    }

    if (
      focusedMetric.runHash === runHash &&
      focusedMetric.metricName === metricName &&
      focusedMetric.traceContext === traceContext
    ) {
      return;
    }

    setChartFocusedState({
      metric: {
        runHash,
        metricName,
        traceContext,
      },
    });
  }

  function handleRowClick(runHash, metricName, traceContext) {
    const focusedCircle = HubMainScreenModel.getState().chart.focused.circle;
    let step = HubMainScreenModel.getState().chart.focused.step;

    if (
      (isExploreParamsModeEnabled() && focusedCircle.runHash === runHash) ||
      (focusedCircle.runHash === runHash &&
        focusedCircle.metricName === metricName &&
        focusedCircle.traceContext === traceContext)
    ) {
      setChartFocusedActiveState({
        step: step || 0,
        circle: {
          active: false,
          runHash: null,
          metricName: null,
          traceContext: null,
          step: null,
        },
      });
      return;
    }

    if (isExploreParamsModeEnabled()) {
      setChartFocusedActiveState({
        step: step,
        circle: {
          active: true,
          runHash: runHash,
          metricName: null,
          traceContext: null,
        },
        metric: {
          runHash: null,
          metricName: null,
          traceContext: null,
        },
      });
    } else {
      const line = getTraceData(runHash, metricName, traceContext);
      if (line === null || line.data === null || !line.data.length) {
        return;
      }

      if (step === null) {
        step = line?.axisValues?.[line?.axisValues?.length - 1];
      } else {
        step = getClosestStepData(step, line?.data, line?.axisValues)
          .closestStep;
      }

      setChartFocusedActiveState({
        step: step,
        circle: {
          active: true,
          runHash: runHash,
          metricName: metricName,
          traceContext: traceContext,
          step: step,
        },
        metric: {
          runHash: null,
          metricName: null,
          traceContext: null,
        },
      });
    }
  }

  function _renderContentLoader() {
    const cellHeight = 25,
      cellWidth = 35,
      marginX = 25,
      marginY = 20;
    const colsTemplates = [
      [1, 3, 1, 1, 1],
      [3, 3, 5, 1, 1, 7, 2, 2, 1, 1],
    ];

    return (
      <div className='ContextBox__loader__wrapper'>
        <ContentLoader
          width={1200}
          height={250}
          backgroundColor='#F3F3F3'
          foregroundColor='#ECEBEB'
        >
          {[
            [-1, 0],
            [-1, 1],
            [-3, 1],
            [-1, 1],
            [-3, 1],
          ].map((rowMeta, rowIdx) => (
            <Fragment key={rowIdx}>
              {colsTemplates[rowMeta[1]]
                .slice(0, rowMeta[0])
                .map((colSize, colIdx) => (
                  <rect
                    key={`${rowIdx}-${colIdx}`}
                    x={
                      colIdx
                        ? colsTemplates[rowMeta[1]]
                          .slice(0, colIdx)
                          .reduce((a, b) => a + b) *
                            cellWidth +
                          (colIdx + 1) * marginX
                        : marginX
                    }
                    y={rowIdx * (cellHeight + marginY) + marginY}
                    rx={5}
                    ry={5}
                    width={colSize * cellWidth}
                    height={cellHeight}
                  />
                ))}
            </Fragment>
          ))}
        </ContentLoader>
      </div>
    );
  }

  function _renderContent() {
    if (runs.isEmpty || !runs.data.length) {
      return <div className='ContextBox__empty__wrapper' />;
    }

    paramKeys.current = {};

    traceList?.traces.forEach((trace) => {
      trace.series.forEach((series) => {
        Object.keys(series?.run.params).forEach((paramKey) => {
          if (paramKey !== '__METRICS__') {
            if (!paramKeys.current.hasOwnProperty(paramKey)) {
              paramKeys.current[paramKey] = [];
            }
            Object.keys(series?.run.params[paramKey]).forEach((key) => {
              if (!paramKeys.current[paramKey].includes(key)) {
                paramKeys.current[paramKey].push(key);
              }
            });
          }
        });
      });
    });

    paramKeys.current = sortOnKeys(paramKeys.current);

    let columns = [
      {
        key: 'experiment',
        content: (
          <>
            <UI.Text overline>Experiment</UI.Text>
            <ColumnGroupPopup
              param='experiment'
              contextFilter={contextFilter}
              setContextFilter={setContextFilter}
            />
          </>
        ),
        topHeader: 'Metrics',
        pin: 'left',
      },
      {
        key: 'run',
        content: (
          <>
            <UI.Text overline>Run</UI.Text>
            <ColumnGroupPopup
              param='run.hash'
              contextFilter={contextFilter}
              setContextFilter={setContextFilter}
            />
          </>
        ),
        topHeader: 'Metrics',
        pin: 'left',
      },
    ];

    if (isExploreMetricsModeEnabled()) {
      columns = columns.concat([
        {
          key: 'metric',
          content: (
            <>
              <UI.Text overline>Metric</UI.Text>
              <ColumnGroupPopup
                param='metric'
                contextFilter={contextFilter}
                setContextFilter={setContextFilter}
              />
            </>
          ),
          topHeader: 'Metrics',
          pin: 'left',
        },
        {
          key: 'context',
          content: <UI.Text overline>Context</UI.Text>,
          topHeader: 'Metrics',
          pin: 'left',
        },
        {
          key: 'value',
          content: <UI.Text overline>Value</UI.Text>,
          topHeader: 'Metrics',
          minWidth: 100,
        },
        {
          key: 'step',
          content: <UI.Text overline>Step</UI.Text>,
          topHeader: 'Metrics',
        },
        {
          key: 'epoch',
          content: <UI.Text overline>Epoch</UI.Text>,
          topHeader: 'Metrics',
        },
        {
          key: 'time',
          content: <UI.Text overline>Time</UI.Text>,
          topHeader: 'Metrics',
          minWidth: 150,
        },
      ]);
    }

    for (let metricKey in runs?.aggMetrics) {
      runs?.aggMetrics[metricKey].forEach((metricContext) => {
        columns.push({
          key: `${metricKey}-${JSON.stringify(metricContext)}`,
          content: (
            <div className='ContextBox__table__agg-metrics__labels'>
              {metricContext === null ||
              Object.keys(metricContext).length === 0 ? (
                  <UI.Label
                    key={0}
                    size='small'
                    className='ContextBox__table__agg-metrics__label'
                  >
                  No context
                  </UI.Label>
                ) : (
                  Object.keys(metricContext).map((metricContextKey) => (
                    <UI.Label
                      key={metricContextKey}
                      size='small'
                      className='ContextBox__table__agg-metrics__label'
                    >
                      {metricContextKey}:{' '}
                      {formatValue(metricContext[metricContextKey])}
                    </UI.Label>
                  ))
                )}
            </div>
          ),
          topHeader: metricKey,
        });
      });
    }

    Object.keys(paramKeys.current).forEach((paramKey) =>
      paramKeys.current[paramKey].sort().forEach((key) => {
        const param = `params.${paramKey}.${key}`;
        columns.push({
          key: param,
          content: (
            <>
              <UI.Text small>{key}</UI.Text>
              <ColumnGroupPopup
                param={param}
                contextFilter={contextFilter}
                setContextFilter={setContextFilter}
              />
            </>
          ),
          topHeader: paramKey,
        });
      }),
    );

    const data = traceList?.traces.length > 1 ? {} : [];
    const expanded = {};
    const step = chart.focused.circle.active
      ? chart.focused.circle.step
      : chart.focused.step;
    const focusedCircle = chart.focused.circle;
    const focusedMetric = chart.focused.metric;

    traceList?.traces.forEach((traceModel) => {
      (isExploreParamsModeEnabled()
        ? _.uniqBy(traceModel.series, 'run.run_hash')
        : traceModel.series
      ).forEach((series) => {
        const { run, metric, trace } = series;
        const contextHash = contextToHash(trace?.context);

        const line = getTraceData(run.run_hash, metric?.name, contextHash);

        let { stepData } = getClosestStepData(
          step,
          line?.data,
          line?.axisValues,
        );

        const color =
          traceList?.grouping?.color?.length > 0
            ? traceModel.color
            : getMetricColor(
              run,
              isExploreParamsModeEnabled() ? null : line?.metric,
              isExploreParamsModeEnabled() ? null : line?.trace,
            );
        const colorObj = Color(color);

        let active = false;

        if (
          (isExploreParamsModeEnabled() &&
            (focusedCircle.runHash === run.run_hash ||
              focusedMetric.runHash === run.run_hash)) ||
          (focusedCircle.runHash === run.run_hash &&
            focusedCircle.metricName === metric?.name &&
            focusedCircle.traceContext === contextHash) ||
          (focusedMetric.runHash === run.run_hash &&
            focusedMetric.metricName === metric?.name &&
            focusedMetric.traceContext === contextHash)
        ) {
          active = true;
        }

        if (
          (isExploreParamsModeEnabled() &&
            focusedCircle.runHash === run.run_hash) ||
          (focusedCircle.runHash === run.run_hash &&
            focusedCircle.metricName === metric?.name &&
            focusedCircle.traceContext === contextHash)
        ) {
          expanded[JSON.stringify(traceModel.config)] = true;
        }

        const cellClassName = classNames({
          ContextBox__table__cell: true,
          active: active,
          [`cell-${traceToHash(
            run.run_hash,
            isExploreParamsModeEnabled() ? null : metric?.name,
            isExploreParamsModeEnabled() ? null : contextHash,
          )}`]: true,
        });

        let style = {};
        if (active) {
          style = {
            backgroundColor: colorObj.lightness(96.5).hsl().string(),
          };
        }

        // const highlightColumn = (evt) => {
        //   handleRowMove(run.run_hash, metric?.name, contextHash);
        //   evt.currentTarget.parentNode.style.backgroundColor =
        //     style.backgroundColor;
        // };

        // function removeColumnHighlighting(evt) {
        //   evt.currentTarget.parentNode.style.backgroundColor = '#FFF';
        // }

        const row = {
          experiment: {
            content: run.experiment_name,
            style: {
              color: active ? '#FFF' : color,
              backgroundColor: active ? color : '#FAFAFA',
            },
            className: `metric ${cellClassName}`,
            props: {
              onClick: () =>
                handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: () =>
                handleRowMove(run.run_hash, metric?.name, contextHash),
            },
          },
          run: {
            content: (
              <Link
                className='ContextBox__table__item__name'
                to={buildUrl(HUB_PROJECT_EXPERIMENT, {
                  experiment_name: run.experiment_name,
                  commit_id: run.run_hash,
                })}
              >
                {moment(run.date * 1000).format('HH:mm · D MMM, YY')}
              </Link>
            ),
            style: {
              color: active ? '#FFF' : color,
              backgroundColor: active ? color : '#FAFAFA',
            },
            className: `metric ${cellClassName}`,
            props: {
              onClick: (evt) => {
                if (evt.target === evt.currentTarget) {
                  handleRowClick(run.run_hash, metric?.name, contextHash);
                }
              },
              onMouseMove: () =>
                handleRowMove(run.run_hash, metric?.name, contextHash),
            },
          },
          metric: {
            content: metric?.name ?? '-',
            style: {
              color: active ? '#FFF' : color,
              backgroundColor: active ? color : '#FAFAFA',
            },
            className: `metric ${cellClassName}`,
            props: {
              onClick: () =>
                handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: () =>
                handleRowMove(run.run_hash, metric?.name, contextHash),
            },
          },
          context: {
            content: !!trace?.context ? (
              <div className='ContextBox__table__item-context__wrapper'>
                {Object.keys(trace.context).map((contextCat, contextCatKey) => (
                  <ColumnGroupPopup
                    key={contextCatKey}
                    param={`context.${contextCat}`}
                    triggerer={
                      <UI.Button
                        className='ContextBox__table__item-context__item'
                        size='small'
                        type='primary'
                        ghost={true}
                      >
                        <UI.Text inline>
                          {contextCat}=
                          {formatValue(trace.context?.[contextCat])}
                        </UI.Text>
                      </UI.Button>
                    }
                    contextFilter={contextFilter}
                    setContextFilter={setContextFilter}
                  />
                ))}
              </div>
            ) : (
              '-'
            ),
            style: {
              backgroundColor: active ? color : '#FAFAFA',
            },
            className: `metric ${cellClassName}`,
            props: {
              onClick: () =>
                handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: () =>
                handleRowMove(run.run_hash, metric?.name, contextHash),
            },
          },
          value: {
            content:
              stepData !== null && stepData[0] !== null
                ? roundValue(stepData[0])
                : '-',
            style: style,
            className: `value-${traceToHash(
              run.run_hash,
              metric?.name,
              contextHash,
            )} ${cellClassName}`,
            props: {
              onClick: () =>
                handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: () =>
                handleRowMove(run.run_hash, metric?.name, contextHash),
            },
          },
          step: {
            content:
              stepData !== null && stepData[1] !== null ? stepData[1] : '-',
            style: style,
            className: `step-${traceToHash(
              run.run_hash,
              metric?.name,
              contextHash,
            )} ${cellClassName}`,
            props: {
              onClick: () =>
                handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: () =>
                handleRowMove(run.run_hash, metric?.name, contextHash),
            },
          },
          epoch: {
            content:
              stepData !== null && stepData[2] !== null ? stepData[2] : '-',
            style: style,
            className: `epoch-${traceToHash(
              run.run_hash,
              metric?.name,
              contextHash,
            )} ${cellClassName}`,
            props: {
              onClick: () =>
                handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: () =>
                handleRowMove(run.run_hash, metric?.name, contextHash),
            },
          },
          time: {
            content:
              stepData !== null && stepData[3] !== null
                ? moment.unix(stepData[3]).format('HH:mm:ss · D MMM, YY')
                : '-',
            style: style,
            className: `time-${traceToHash(
              run.run_hash,
              metric?.name,
              contextHash,
            )} ${cellClassName}`,
            props: {
              onClick: () =>
                handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: () =>
                handleRowMove(run.run_hash, metric?.name, contextHash),
            },
          },
        };

        for (let metricKey in runs?.aggMetrics) {
          runs?.aggMetrics[metricKey].forEach((metricContext) => {
            row[`${metricKey}-${JSON.stringify(metricContext)}`] = {
              content: formatValue(
                series.getAggregatedMetricValue(metricKey, metricContext),
                true,
              ),
              style: style,
              className: cellClassName,
              props: {
                onClick: () =>
                  handleRowClick(run.run_hash, metric?.name, contextHash),
                onMouseMove: () =>
                  handleRowMove(run.run_hash, metric?.name, contextHash),
              },
            };
          });
        }

        Object.keys(paramKeys.current).forEach((paramKey) =>
          paramKeys.current[paramKey].forEach((key) => {
            row[`params.${paramKey}.${key}`] = {
              content: formatValue(run.params?.[paramKey]?.[key]),
              style: style,
              className: cellClassName,
              props: {
                onClick: () =>
                  handleRowClick(run.run_hash, metric?.name, contextHash),
                onMouseMove: () =>
                  handleRowMove(run.run_hash, metric?.name, contextHash),
              },
            };
          }),
        );

        if (traceList?.traces.length > 1) {
          if (!data[JSON.stringify(traceModel.config)]) {
            const min = getMetricStepDataByStepIdx(
              traceModel.aggregation.min.trace.data,
              step,
            )?.[0];
            const avg = getMetricStepDataByStepIdx(
              traceModel.aggregation.avg.trace.data,
              step,
            )?.[0];
            const max = getMetricStepDataByStepIdx(
              traceModel.aggregation.max.trace.data,
              step,
            )?.[0];
            const runsCount = _.uniqBy(traceModel.series, 'run.run_hash')
              .length;
            data[JSON.stringify(traceModel.config)] = {
              items: [],
              data: {
                experiment: {
                  content: (
                    <UI.Label
                      className='ContextBox__table__item-aggregated_label'
                      color={
                        traceList?.grouping?.color?.length > 0
                          ? color
                          : '#3b5896'
                      }
                    >
                      {traceModel.experiments.length === 1 ? (
                        traceModel.experiments[0]
                      ) : (
                        <UI.Tooltip tooltip={traceModel.experiments.join(', ')}>
                          {traceModel.experiments.length} experiments
                        </UI.Tooltip>
                      )}
                    </UI.Label>
                  ),
                  expandable: true,
                },
                run: {
                  content: (
                    <UI.Label
                      className='ContextBox__table__item-aggregated_label'
                      color={
                        traceList?.grouping?.color?.length > 0
                          ? color
                          : '#3b5896'
                      }
                    >
                      {runsCount} run{runsCount > 1 ? 's' : ''}
                    </UI.Label>
                  ),
                  expandable: true,
                },
                metric: {
                  content: (
                    <UI.Label
                      className='ContextBox__table__item-aggregated_label'
                      color={
                        traceList?.grouping?.color?.length > 0
                          ? color
                          : '#3b5896'
                      }
                    >
                      {traceModel.metrics.length === 1 ? (
                        traceModel.metrics[0]
                      ) : (
                        <UI.Tooltip tooltip={traceModel.metrics.join(', ')}>
                          {traceModel.metrics.length} metrics
                        </UI.Tooltip>
                      )}
                    </UI.Label>
                  ),
                  expandable: true,
                },
                context: {
                  content: (
                    <div className='ContextBox__table__item-aggregated_labels'>
                      {!!traceModel.contexts?.length ? (
                        <UI.Label
                          className='ContextBox__table__item-aggregated_label'
                          color={
                            traceList?.grouping?.color?.length > 0
                              ? color
                              : '#3b5896'
                          }
                        >
                          {traceModel.contexts[0]}
                        </UI.Label>
                      ) : (
                        '-'
                      )}
                      {traceModel.contexts?.length > 1 && (
                        <UI.Label
                          className='ContextBox__table__item-aggregated_label'
                          color={
                            traceList?.grouping?.color?.length > 0
                              ? color
                              : '#3b5896'
                          }
                          rounded
                        >
                          <UI.Tooltip
                            tooltip={traceModel.contexts.slice(1).join(', ')}
                          >
                            +{traceModel.contexts.length - 1}
                          </UI.Tooltip>
                        </UI.Label>
                      )}
                    </div>
                  ),
                  expandable: true,
                },
                value: {
                  content: (
                    <div className='ContextBox__table__item-aggregated_labels'>
                      <UI.Label
                        className='ContextBox__table__item-aggregated_label min'
                        iconLeft={
                          <UI.Tooltip tooltip={'Minimum value'}>
                            <UI.Icon
                              i='vertical_align_bottom'
                              className='ContextBox__table__item-aggregated_icon'
                              scale={1.2}
                            />
                          </UI.Tooltip>
                        }
                        rounded
                        outline
                      >
                        {min !== null && min !== undefined
                          ? roundValue(min)
                          : '-'}
                      </UI.Label>
                      <UI.Label
                        className='ContextBox__table__item-aggregated_label avg'
                        iconLeft={
                          <UI.Tooltip tooltip={'Average value'}>
                            <UI.Icon
                              i='vertical_align_center'
                              className='ContextBox__table__item-aggregated_icon'
                              scale={1.2}
                            />
                          </UI.Tooltip>
                        }
                        outline
                        rounded
                      >
                        {avg !== null && avg !== undefined
                          ? roundValue(avg)
                          : '-'}
                      </UI.Label>
                      <UI.Label
                        className='ContextBox__table__item-aggregated_label max'
                        iconLeft={
                          <UI.Tooltip tooltip={'Maximum value'}>
                            <UI.Icon
                              i='vertical_align_top'
                              className='ContextBox__table__item-aggregated_icon'
                              scale={1.2}
                            />
                          </UI.Tooltip>
                        }
                        outline
                        rounded
                      >
                        {max !== null && max !== undefined
                          ? roundValue(max)
                          : '-'}
                      </UI.Label>
                    </div>
                  ),
                  className: `value-${JSON.stringify(traceModel.config).replace(
                    /\.|"|:|{|}|,/g,
                    '_',
                  )}`,
                },
                // step: {
                //   content:
                //     stepData !== null && stepData[1] !== null
                //       ? stepData[1]
                //       : '-',
                //   className: `step-${JSON.stringify(traceModel.config).replace(
                //     /\.|"|:|{|}|,/g,
                //     '_',
                //   )}`,
                // },
              },
              config: (
                <>
                  <GroupConfigPopup
                    config={traceModel.config}
                    rowsCount={traceModel.series.length}
                  />
                  {traceList?.grouping?.chart?.length > 0 && (
                    <UI.Tooltip tooltip='Group Chart ID'>
                      <div className='ContextBox__table__group-indicator__chart'>
                        {traceModel.chart + 1}
                      </div>
                    </UI.Tooltip>
                  )}
                  {traceList?.grouping?.color?.length > 0 && (
                    <UI.Tooltip tooltip='Group Color'>
                      <div
                        className='ContextBox__table__group-indicator__color'
                        style={{
                          backgroundColor: traceModel.color,
                          borderColor: traceModel.color,
                        }}
                      />
                    </UI.Tooltip>
                  )}
                  {traceList?.grouping?.stroke?.length > 0 && (
                    <UI.Tooltip tooltip='Group Stroke Style'>
                      <svg
                        className='ContextBox__table__group-indicator__stroke'
                        style={{
                          borderColor:
                            traceList?.grouping?.color?.length > 0
                              ? traceModel.color
                              : '#3b5896',
                        }}
                      >
                        <line
                          x1='0'
                          y1='50%'
                          x2='100%'
                          y2='50%'
                          style={{
                            strokeDasharray: traceModel.stroke
                              .split(' ')
                              .map((elem) => (elem / 5) * 3)
                              .join(' '),
                          }}
                        />
                      </svg>
                    </UI.Tooltip>
                  )}
                </>
              ),
            };

            let stepValue;
            let epochValue;
            for (let i = 0; i < traceModel.series.length; i++) {
              const series = traceModel.series[i];
              let { stepData } = getClosestStepData(
                step,
                series?.trace?.data,
                series?.trace?.axisValues,
              );
              if (i === 0) {
                stepValue = stepData?.[1];
                epochValue = stepData?.[2];
              } else {
                if (stepValue !== stepData?.[1]) {
                  stepValue = undefined;
                }
                if (epochValue !== stepData?.[2]) {
                  epochValue = undefined;
                }
              }
            }

            data[JSON.stringify(traceModel.config)].data.step = {
              content: stepValue ?? '-',
              className: `step-${JSON.stringify(traceModel.config).replace(
                /\.|"|:|{|}|,/g,
                '_',
              )}`,
            };

            data[JSON.stringify(traceModel.config)].data.epoch = {
              content: epochValue ?? '-',
              className: `epoch-${JSON.stringify(traceModel.config).replace(
                /\.|"|:|{|}|,/g,
                '_',
              )}`,
            };

            for (let metricKey in runs?.aggMetrics) {
              runs?.aggMetrics[metricKey].forEach((metricContext) => {
                const { min, avg, max } = traceModel.getAggregatedMetricMinMax(
                  metricKey,
                  metricContext,
                );
                data[JSON.stringify(traceModel.config)].data[
                  `${metricKey}-${JSON.stringify(metricContext)}`
                ] = {
                  content: (
                    <div className='ContextBox__table__item-aggregated_labels'>
                      <UI.Label
                        className='ContextBox__table__item-aggregated_label'
                        iconLeft={
                          <UI.Tooltip tooltip={'Minimum value'}>
                            <UI.Icon
                              i='vertical_align_bottom'
                              className='ContextBox__table__item-aggregated_icon'
                              scale={1.2}
                            />
                          </UI.Tooltip>
                        }
                        rounded
                        outline
                      >
                        {min !== null && min !== undefined
                          ? roundValue(min)
                          : '-'}
                      </UI.Label>
                      <UI.Label
                        className='ContextBox__table__item-aggregated_label'
                        iconLeft={
                          <UI.Tooltip tooltip={'Average value'}>
                            <UI.Icon
                              i='vertical_align_center'
                              className='ContextBox__table__item-aggregated_icon'
                              scale={1.2}
                            />
                          </UI.Tooltip>
                        }
                        rounded
                        outline
                      >
                        {avg !== null && avg !== undefined
                          ? roundValue(avg)
                          : '-'}
                      </UI.Label>
                      <UI.Label
                        className='ContextBox__table__item-aggregated_label'
                        iconLeft={
                          <UI.Tooltip tooltip={'Maximum value'}>
                            <UI.Icon
                              i='vertical_align_top'
                              className='ContextBox__table__item-aggregated_icon'
                              scale={1.2}
                            />
                          </UI.Tooltip>
                        }
                        outline
                        rounded
                      >
                        {max !== null && max !== undefined
                          ? roundValue(max)
                          : '-'}
                      </UI.Label>
                    </div>
                  ),
                };
              });
            }

            Object.keys(paramKeys.current).forEach((paramKey) =>
              paramKeys.current[paramKey].forEach((key) => {
                const param = `params.${paramKey}.${key}`;
                if (traceModel.config.hasOwnProperty(param)) {
                  data[JSON.stringify(traceModel.config)].data[
                    param
                  ] = formatValue(traceModel.config[param]);
                } else {
                  let value;
                  for (let i = 0; i < traceModel.series.length; i++) {
                    const series = traceModel.series[i];
                    if (i === 0) {
                      value = _.get(series, param);
                    } else {
                      if (value !== _.get(series, param)) {
                        value = undefined;
                        break;
                      }
                    }
                  }
                  data[JSON.stringify(traceModel.config)].data[
                    param
                  ] = formatValue(value);
                }
              }),
            );
          }
          data[JSON.stringify(traceModel.config)].items.push(row);
        } else {
          data.push(row);
        }
      });
    });

    return (
      <div
        className={classNames({
          ContextBox__content: true,
          resizing: props.resizing,
        })}
      >
        <div className='ContextBox__table__wrapper'>
          <ContextTable
            name='context'
            topHeader
            columns={columns}
            data={data}
            groups={traceList?.traces.length > 1}
            expanded={expanded}
            forcePinnedColumns={forcePinnedColumns}
            updateForcePinnedColumns={updateForcePinnedColumns}
            searchFields={searchFields}
            displayViewModes
            viewMode={props.viewMode}
            setViewMode={props.setViewMode}
            displaySort
            sortFields={sortFields}
            setSortFields={setSortFields}
          />
        </div>
      </div>
    );
  }

  useEffect(() => {
    const groupingFields = traceList?.groupingFields;
    const forcePinnedColumnsClone = {
      ...forcePinnedColumns,
    };
    for (let colKey in forcePinnedColumnsClone) {
      if (groupingFields && !groupingFields.includes(colKey)) {
        forcePinnedColumnsClone[colKey] =
          forcePinnedColumnsClone[colKey] === null ? undefined : false;
      }
    }
    groupingFields?.forEach((field) => {
      if (forcePinnedColumnsClone?.[field] !== null) {
        forcePinnedColumnsClone[field] = true;
      }
    });
    const newForcePinnedColumns = JSON.parse(
      JSON.stringify(forcePinnedColumnsClone),
    );
    if (!_.isEqual(newForcePinnedColumns, forcePinnedColumns)) {
      setForcePinnedColumns(newForcePinnedColumns);
    }

    const paramFields = getAllParamsPaths(false);
    const deepParamFields = getAllParamsPaths(true, true);
    const metrics = isExploreParamsModeEnabled() ? getAllMetrics() : null;
    if (
      !_.isEqual(deepParamFields, searchFields.params.deepParamFields) ||
      !_.isEqual(metrics, searchFields.metrics)
    ) {
      setSearchFields({
        params: {
          paramFields,
          deepParamFields,
        },
        metrics,
      });
    }
  });

  useEffect(() => {
    const subscription = HubMainScreenModel.subscribe(
      HubMainScreenModel.events.SET_CHART_FOCUSED_STATE,
      () => {
        window.requestAnimationFrame(() => {
          const { traceList, chart } = HubMainScreenModel.getState();

          const step = chart.focused.step;
          const focusedCircle = chart.focused.circle;
          const focusedMetric = chart.focused.metric;

          let groupStepData = {};
          let groupEpochData = {};

          const currentActiveRow = document.querySelectorAll(
            '.ContextBox__table__cell.active',
          );
          currentActiveRow?.forEach((cell) => {
            cell.classList.remove('active');
            cell.style.color = cell.classList.contains('metric')
              ? cell.style.backgroundColor
              : '';
            cell.style.backgroundColor = cell.classList.contains('metric')
              ? '#FAFAFA'
              : 'inherit';
          });
          traceList?.traces.forEach((traceModel) => {
            const groupSelector = JSON.stringify(traceModel.config).replace(
              /\.|"|:|{|}|,/g,
              '_',
            );
            (isExploreParamsModeEnabled()
              ? _.uniqBy(traceModel.series, 'run.run_hash')
              : traceModel.series
            ).forEach((series) => {
              const { run, metric, trace } = series;
              const contextHash = contextToHash(trace?.context);

              const line = getTraceData(
                run.run_hash,
                metric?.name,
                contextHash,
              );

              let { stepData } = getClosestStepData(
                step,
                line?.data,
                line?.axisValues,
              );

              if (stepData !== null && stepData[1] !== null) {
                if (!groupStepData.hasOwnProperty(groupSelector)) {
                  groupStepData[groupSelector] = stepData[1];
                  groupEpochData[groupSelector] = stepData[2];
                } else {
                  if (groupStepData[groupSelector] !== stepData[1]) {
                    groupStepData[groupSelector] = undefined;
                    groupEpochData[groupSelector] = undefined;
                  }
                }
              }

              let active = false;

              if (
                (isExploreParamsModeEnabled() &&
                  (focusedCircle.runHash === run.run_hash ||
                    focusedMetric.runHash === run.run_hash)) ||
                (focusedCircle.runHash === run.run_hash &&
                  focusedCircle.metricName === metric?.name &&
                  focusedCircle.traceContext === contextHash) ||
                (focusedMetric.runHash === run.run_hash &&
                  focusedMetric.metricName === metric?.name &&
                  focusedMetric.traceContext === contextHash)
              ) {
                active = true;
              }

              if (active) {
                const color =
                  traceList?.grouping?.color?.length > 0
                    ? traceModel.color
                    : getMetricColor(
                      run,
                      isExploreParamsModeEnabled() ? null : line?.metric,
                      isExploreParamsModeEnabled() ? null : line?.trace,
                    );
                const colorObj = Color(color);
                const activeRow = document.querySelectorAll(
                  `.cell-${traceToHash(
                    run.run_hash,
                    isExploreParamsModeEnabled() ? null : metric?.name,
                    isExploreParamsModeEnabled() ? null : contextHash,
                  )}`,
                );
                activeRow.forEach((cell) => {
                  cell.classList.add('active');
                  cell.style.backgroundColor = cell.classList.contains('metric')
                    ? color
                    : colorObj.lightness(96.5).hsl().string();
                  cell.style.color = cell.classList.contains('metric')
                    ? '#FFF'
                    : '';
                });
              }

              if (isExploreMetricsModeEnabled()) {
                const valueCell = document.querySelector(
                  `.value-${traceToHash(
                    run.run_hash,
                    metric?.name,
                    contextHash,
                  )}`,
                );
                if (!!valueCell) {
                  valueCell.textContent =
                    stepData !== null && stepData[0] !== null
                      ? roundValue(stepData[0])
                      : '-';
                }
                const stepCell = document.querySelector(
                  `.step-${traceToHash(
                    run.run_hash,
                    metric?.name,
                    contextHash,
                  )}`,
                );
                if (!!stepCell) {
                  stepCell.textContent =
                    stepData !== null && stepData[1] !== null
                      ? stepData[1]
                      : '-';
                }

                const epochCell = document.querySelector(
                  `.epoch-${traceToHash(
                    run.run_hash,
                    metric?.name,
                    contextHash,
                  )}`,
                );
                if (!!epochCell) {
                  epochCell.textContent =
                    stepData !== null && stepData[2] !== null
                      ? stepData[2]
                      : '-';
                }

                const timeCell = document.querySelector(
                  `.time-${traceToHash(
                    run.run_hash,
                    metric?.name,
                    contextHash,
                  )}`,
                );
                if (!!timeCell) {
                  timeCell.textContent =
                    stepData !== null && stepData[3] !== null
                      ? moment.unix(stepData[3]).format('HH:mm:ss · D MMM, YY')
                      : '-';
                }
              }
            });

            if (isExploreMetricsModeEnabled() && traceList?.traces.length > 1) {
              const groupSetpCell = document.querySelector(
                `.step-${groupSelector}`,
              );
              const groupEpochCell = document.querySelector(
                `.epoch-${groupSelector}`,
              );
              if (!!groupSetpCell) {
                groupSetpCell.textContent = groupStepData[groupSelector] ?? '-';
              }
              if (!!groupEpochCell) {
                groupEpochCell.textContent =
                  groupEpochData[groupSelector] ?? '-';
              }

              const min = getMetricStepDataByStepIdx(
                traceModel.aggregation.min.trace.data,
                step,
              )?.[0];
              const avg = getMetricStepDataByStepIdx(
                traceModel.aggregation.avg.trace.data,
                step,
              )?.[0];
              const max = getMetricStepDataByStepIdx(
                traceModel.aggregation.max.trace.data,
                step,
              )?.[0];

              const groupValueCellMin = document.querySelector(
                `.value-${groupSelector} .min .Label__content`,
              );
              if (!!groupValueCellMin) {
                groupValueCellMin.textContent =
                  min !== null && min !== undefined ? roundValue(min) : '-';
              }

              const groupValueCellAvg = document.querySelector(
                `.value-${groupSelector} .avg .Label__content`,
              );
              if (!!groupValueCellAvg) {
                groupValueCellAvg.textContent =
                  avg !== null && avg !== undefined ? roundValue(avg) : '-';
              }

              const groupValueCellMax = document.querySelector(
                `.value-${groupSelector} .max .Label__content`,
              );
              if (!!groupValueCellMax) {
                groupValueCellMax.textContent =
                  max !== null && max !== undefined ? roundValue(max) : '-';
              }
            }
          });
        });
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div
      className={classNames({
        ContextBox: true,
        spacing: props.spacing,
      })}
      style={{
        width: `${props.width}px`,
      }}
    >
      {runs.isLoading ? _renderContentLoader() : _renderContent()}
    </div>
  );
}

ContextBox.propTypes = {};

export default React.memo(ContextBox);
