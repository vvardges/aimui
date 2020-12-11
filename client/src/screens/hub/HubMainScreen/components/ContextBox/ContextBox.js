import './ContextBox.less';

import React, { Component, createRef, Fragment } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Color from 'color';
import moment from 'moment';
import * as _ from 'lodash';
import ContentLoader from 'react-content-loader';

import HubMainScreenContext from '../../HubMainScreenContext/HubMainScreenContext';
import { buildUrl, classNames, sortOnKeys, formatValue, roundValue } from '../../../../../utils';
import UI from '../../../../../ui';
import { HUB_PROJECT_EXPERIMENT } from '../../../../../constants/screens';
import ColumnGroupPopup from './components/ColumnGroupPopup/ColumnGroupPopup';
import GroupConfigPopup from './components/GroupConfigPopup/GroupConfigPopup';
import { getItem } from '../../../../../services/storage';
import { TABLE_COLUMNS } from '../../../../../config';

class ContextBox extends Component {
  paramKeys = {};
  theadRef = createRef();

  constructor(props) {
    super(props);
    const tableColumns = JSON.parse(getItem(TABLE_COLUMNS))?.context
    this.state = {
      forcePinnedColumns: tableColumns?.forcePinned
    };
  }

  componentDidUpdate(prevProps, prevState) {
    const groupingFields = this.context.traceList?.groupingFields;
    const forcePinnedColumns = {
      ...this.state.forcePinnedColumns
    };
    for (let colKey in forcePinnedColumns) {
      if (groupingFields && !groupingFields.includes(colKey)) {
        forcePinnedColumns[colKey] = forcePinnedColumns[colKey] === null ? undefined : false;
      }
    }
    groupingFields?.forEach(field => {
      if (forcePinnedColumns?.[field] !== null) {
        forcePinnedColumns[field] = true;
      }
    });
    const newForcePinnedColumns = JSON.parse(JSON.stringify(forcePinnedColumns))
    if (!_.isEqual(newForcePinnedColumns, this.state.forcePinnedColumns)) {
      this.setState({
        forcePinnedColumns: newForcePinnedColumns
      });
    }
  }

  updateForcePinnedColumns = (columnKey, value) => {
    this.setState(state => {
      let newCols = {};
      for (let key in state.forcePinnedColumns) {
        if (key === columnKey) {
          if (value !== undefined) {
            newCols[key] = value;
          }
        } else {
          newCols[key] = state.forcePinnedColumns[key];
        }
      }
      return {
        forcePinnedColumns: newCols
      };
    });
  };

  handleRowMove = (runHash, metricName, traceContext) => {
    const focusedCircle = this.context.chart.focused.circle;
    const focusedMetric = this.context.chart.focused.metric;

    if (focusedCircle.active) {
      return;
    }

    if (focusedMetric.runHash === runHash && focusedMetric.metricName === metricName
      && focusedMetric.traceContext === traceContext) {
      return;
    }

    this.context.setChartFocusedState({
      metric: {
        runHash,
        metricName,
        traceContext,
      },
    });
  };

  handleRowClick = (runHash, metricName, traceContext) => {
    const focusedCircle = this.context.chart.focused.circle;
    let step = this.context.chart.focused.step;

    if (focusedCircle.runHash === runHash && focusedCircle.metricName === metricName
      && focusedCircle.traceContext === traceContext) {
      this.context.setChartFocusedState({
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

    if (this.context.runs?.meta?.params_selected) {
      this.context.setChartFocusedState({
        step: step,
        circle: {
          active: true,
          runHash: runHash,
          metricName: metricName,
          traceContext: traceContext,
        },
        metric: {
          runHash: null,
          metricName: null,
          traceContext: null,
        },
      });
    } else {
      const line = this.context.getTraceData(runHash, metricName, traceContext);
      if (line === null || line.data === null || !line.data.length) {
        return;
      }
  
      const point = this.context.getMetricStepDataByStepIdx(line.data, step);
  
      if (point === null) {
        // Select last point
        step = line.data[line.data.length - 1][1];
      }
  
      this.context.setChartFocusedState({
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
  };
  
  _renderContentLoader = () => {
    const cellHeight = 25, cellWidth = 35, marginX = 25, marginY = 20;
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
          {[[-1, 0], [-1, 1], [-3, 1], [-1, 1], [-3, 1]].map((rowMeta, rowIdx) =>
            <Fragment key={rowIdx}>
              {colsTemplates[rowMeta[1]].slice(0, rowMeta[0]).map((colSize, colIdx) =>
                <rect
                  key={`${rowIdx}-${colIdx}`}
                  x={colIdx ? colsTemplates[rowMeta[1]].slice(0, colIdx).reduce((a, b) => a + b) * cellWidth + (colIdx + 1) * marginX : marginX}
                  y={rowIdx * (cellHeight + marginY) + marginY}
                  rx={5}
                  ry={5}
                  width={colSize * cellWidth}
                  height={cellHeight}
                />
              )}
            </Fragment>
          )}
        </ContentLoader>
      </div>
    );
  };

  _renderContent = () => {
    if (this.context.runs.isEmpty || !this.context.runs.data.length) {
      return <div className='ContextBox__empty__wrapper' />;
    }

    this.paramKeys = {};

    this.context.traceList?.traces.forEach(trace => {
      trace.series.forEach(series => {
        Object.keys(series?.run.params).forEach(paramKey => {
          if (paramKey !== '__METRICS__') {
            if (!this.paramKeys.hasOwnProperty(paramKey)) {
              this.paramKeys[paramKey] = [];
            }
            Object.keys(series?.run.params[paramKey]).forEach(key => {
              if (!this.paramKeys[paramKey].includes(key)) {
                this.paramKeys[paramKey].push(key);
              }
            });
          }
        });
      });
    });

    this.paramKeys = sortOnKeys(this.paramKeys);

    let columns = [
      {
        key: 'experiment',
        content: (
          <>
            <UI.Text overline>Experiment</UI.Text>
            <ColumnGroupPopup
              param='experiment'
              contextFilter={this.context.contextFilter}
              setContextFilter={this.context.setContextFilter}
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
              contextFilter={this.context.contextFilter}
              setContextFilter={this.context.setContextFilter}
            />
          </>
        ),
        topHeader: 'Metrics',
        pin: 'left'
      },
    ];

    if (!this.context.runs?.meta?.params_selected) {
      columns = columns.concat([
        {
          key: 'metric',
          content: (
            <>
              <UI.Text overline>Metric</UI.Text>
              <ColumnGroupPopup
                param='metric'
                contextFilter={this.context.contextFilter}
                setContextFilter={this.context.setContextFilter}
              />
            </>
          ),
          topHeader: 'Metrics',
          pin: 'left'
        },
        {
          key: 'context',
          content: <UI.Text overline>Context</UI.Text>,
          topHeader: 'Metrics',
          pin: 'left'
        },
        {
          key: 'value',
          content: <UI.Text overline>Value</UI.Text>,
          topHeader: 'Metrics',
          minWidth: 100
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

    for (let metricKey in this.context.runs?.aggMetrics) {
      this.context.runs?.aggMetrics[metricKey].forEach(metricContext => {
        columns.push({
          key: `${metricKey}-${JSON.stringify(metricContext)}`,
          content: (
            <div className='ContextBox__table__agg-metrics__labels'>
              {(metricContext === null || Object.keys(metricContext).length === 0) ? (
                <UI.Label
                  key={0}
                  size='small'
                  className='ContextBox__table__agg-metrics__label'
                >
                  No context
                </UI.Label>
              ) : Object.keys(metricContext).map(metricContextKey => (
                <UI.Label
                  key={metricContextKey}
                  size='small'
                  className='ContextBox__table__agg-metrics__label'
                >
                  {metricContextKey}: {formatValue(metricContext[metricContextKey])}
                </UI.Label>
              ))}
            </div>
          ),
          topHeader: metricKey,
        });
      });
    }

    Object.keys(this.paramKeys).forEach(paramKey => this.paramKeys[paramKey].sort().forEach(key => {
      const param = `params.${paramKey}.${key}`;
      columns.push({
        key: param,
        content: (
          <>
            <UI.Text small>{key}</UI.Text>
            <ColumnGroupPopup
              param={param}
              contextFilter={this.context.contextFilter}
              setContextFilter={this.context.setContextFilter}
            />
          </>
        ),
        topHeader: paramKey,
      });
    }));

    const data = this.context.traceList?.traces.length > 1 ? {} : [];
    const expanded = {};
    const step = this.context.chart.focused.step;
    const focusedCircle = this.context.chart.focused.circle;
    const focusedMetric = this.context.chart.focused.metric;

    this.context.traceList?.traces.forEach(traceModel => {
      (this.context.runs?.meta?.params_selected ? _.uniqBy(traceModel.series, 'run.run_hash') : traceModel.series).forEach(series => {
        const { run, metric, trace } = series;
        const contextHash = this.context.contextToHash(trace?.context);

        const line = this.context.getTraceData(run.run_hash, metric?.name, contextHash);

        let stepData = line ? this.context.getMetricStepDataByStepIdx(line?.data, step) : null;

        const color = this.context.traceList?.grouping?.color?.length > 0
          ? traceModel.color
          : this.context.getMetricColor(run,
            this.context.enableExploreParamsMode() ? null : line?.metric,
            this.context.enableExploreParamsMode() ? null : line?.trace);
        const colorObj = Color(color);

        let active = false;

        if ((this.context.runs?.meta?.params_selected 
          && ((focusedCircle.runHash === run.run_hash) || (focusedMetric.runHash === run.run_hash)))
          || (
            focusedCircle.runHash === run.run_hash
            && focusedCircle.metricName === metric?.name
            && focusedCircle.traceContext === contextHash)
            || (
              focusedMetric.runHash === run.run_hash
              && focusedMetric.metricName === metric?.name
              && focusedMetric.traceContext === contextHash)) {
          active = true;
        }

        if ((this.context.runs?.meta?.params_selected 
          && (focusedCircle.runHash === run.run_hash))
          || (
            focusedCircle.runHash === run.run_hash
            && focusedCircle.metricName === metric?.name
            && focusedCircle.traceContext === contextHash)) {
          expanded[JSON.stringify(traceModel.config)] = true;
        }

        const className = classNames({
          ContextBox__table__cell: true,
          active: active,
        });

        let style = {};
        if (active) {
          style = {
            backgroundColor: colorObj.lightness(85).hsl().string(),
          };
        }

        const highlightColumn = (evt) => {
          this.handleRowMove(run.run_hash, metric?.name, contextHash);
          evt.currentTarget.parentNode.style.backgroundColor = style.backgroundColor;
        };

        function removeColumnHighlighting(evt) {
          evt.currentTarget.parentNode.style.backgroundColor = '#FFF';
        }

        const row = {
          experiment: {
            content: run.experiment_name,
            style: {
              color: active ? '#FFF' : color,
              backgroundColor: active ? color : '#FAFAFA',
            },
            className: className,
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: () => this.handleRowMove(run.run_hash, metric?.name, contextHash),
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
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: () => this.handleRowMove(run.run_hash, metric?.name, contextHash),
            }
          },
          metric: {
            content: metric?.name ?? '-',
            style: {
              color: active ? '#FFF' : color,
              backgroundColor: active ? color : '#FAFAFA'
            },
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: () => this.handleRowMove(run.run_hash, metric?.name, contextHash),
            }
          },
          context: {
            content: !!trace?.context ? (
              <div className='ContextBox__table__item-context__wrapper'>
                {Object.keys(trace.context).map((contextCat, contextCatKey) => (
                  <ColumnGroupPopup
                    key={contextCatKey}
                    param={`context.${contextCat}`}
                    triggerer={(
                      <UI.Button
                        className='ContextBox__table__item-context__item'
                        size='small'
                        type='primary'
                        ghost={true}
                      >
                        <UI.Text inline>{contextCat}={formatValue(trace.context?.[contextCat])}</UI.Text>
                      </UI.Button>
                    )}
                    contextFilter={this.context.contextFilter}
                    setContextFilter={this.context.setContextFilter}
                  />
                ))}
              </div>
            ) : '-',
            style: {
              backgroundColor: active ? color : '#FAFAFA'
            },
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: () => this.handleRowMove(run.run_hash, metric?.name, contextHash),
            }
          },
          value: {
            content: stepData !== null && stepData[0] !== null ? roundValue(stepData[0]) : '-',
            style: style,
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: highlightColumn,
              onMouseLeave: removeColumnHighlighting
            }
          },
          step: {
            content: stepData !== null && stepData[1] !== null ? stepData[1] : '-',
            style: style,
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: highlightColumn,
              onMouseLeave: removeColumnHighlighting
            }
          },
          epoch: {
            content: stepData !== null && stepData[2] !== null ? stepData[2] : '-',
            style: style,
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: highlightColumn,
              onMouseLeave: removeColumnHighlighting
            }
          },
          time: {
            content: stepData !== null && stepData[3] !== null ? moment.unix(stepData[3]).format('HH:mm:ss · D MMM, YY') : '-',
            style: style,
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: highlightColumn,
              onMouseLeave: removeColumnHighlighting
            }
          }
        };

        for (let metricKey in this.context.runs?.aggMetrics) {
          this.context.runs?.aggMetrics[metricKey].forEach(metricContext => {
            row[`${metricKey}-${JSON.stringify(metricContext)}`] = {
              content: formatValue(series.getAggregatedMetricValue(metricKey, metricContext), true),
              style: style,
              props: {
                onClick: () => this.handleRowClick(run.run_hash, metric?.name, contextHash),
                onMouseMove: highlightColumn,
                onMouseLeave: removeColumnHighlighting
              }
            };
          });
        }

        Object.keys(this.paramKeys).forEach(paramKey => this.paramKeys[paramKey].forEach(key => {
          row[`params.${paramKey}.${key}`] = {
            content: formatValue(run.params?.[paramKey]?.[key]),
            style: style,
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric?.name, contextHash),
              onMouseMove: highlightColumn,
              onMouseLeave: removeColumnHighlighting
            }
          };
        }));

        if (this.context.traceList?.traces.length > 1) {
          if (!data[JSON.stringify(traceModel.config)]) {
            const min = this.context.getMetricStepDataByStepIdx(traceModel.aggregation.min.trace.data, step)?.[0];
            const avg = this.context.getMetricStepDataByStepIdx(traceModel.aggregation.avg.trace.data, step)?.[0];
            const max = this.context.getMetricStepDataByStepIdx(traceModel.aggregation.max.trace.data, step)?.[0];
            const runsCount = (this.context.runs?.meta?.params_selected ? _.uniqBy(traceModel.series, 'run.run_hash') : traceModel.series).length;
            data[JSON.stringify(traceModel.config)] = {
              items: [],
              data: {
                experiment: {
                  content: (
                    <UI.Label
                      className='ContextBox__table__item-aggregated_label'
                      color={this.context.traceList?.grouping?.color?.length > 0 ? color : '#3b5896'}
                    >
                      {traceModel.experiments.length === 1 ? traceModel.experiments[0] : (
                        <UI.Tooltip tooltip={traceModel.experiments.join(', ')}>
                          {traceModel.experiments.length} experiments
                        </UI.Tooltip>
                      )}
                    </UI.Label>
                  ),
                  expandable: true
                },
                run: {
                  content: (
                    <UI.Label
                      className='ContextBox__table__item-aggregated_label'
                      color={this.context.traceList?.grouping?.color?.length > 0 ? color : '#3b5896'}
                    >
                      {runsCount} run{runsCount > 1 ? 's' : ''}
                    </UI.Label>
                  ),
                  expandable: true
                },
                metric: {
                  content: (
                    <UI.Label
                      className='ContextBox__table__item-aggregated_label'
                      color={this.context.traceList?.grouping?.color?.length > 0 ? color : '#3b5896'}
                    >
                      {traceModel.metrics.length === 1 ? traceModel.metrics[0] : (
                        <UI.Tooltip tooltip={traceModel.metrics.join(', ')}>
                          {traceModel.metrics.length} metrics
                        </UI.Tooltip>
                      )}
                    </UI.Label>
                  ),
                  expandable: true
                },
                context: {
                  content: (
                    <div className='ContextBox__table__item-aggregated_labels'>
                      {
                        !!traceModel.contexts?.length
                          ? (
                            <UI.Label 
                              className='ContextBox__table__item-aggregated_label'
                              color={this.context.traceList?.grouping?.color?.length > 0 ? color : '#3b5896'}
                            >
                              {traceModel.contexts[0]}
                            </UI.Label>
                          )
                          : '-'
                      }
                      {
                        traceModel.contexts?.length > 1 && (
                          <UI.Label
                            className='ContextBox__table__item-aggregated_label'
                            color={this.context.traceList?.grouping?.color?.length > 0 ? color : '#3b5896'}
                            rounded
                          >
                            <UI.Tooltip tooltip={traceModel.contexts.slice(1).join(', ')}>
                              +{traceModel.contexts.length - 1}
                            </UI.Tooltip>
                          </UI.Label>
                        )
                      }
                    </div>
                  ),
                  expandable: true
                },
                value: {
                  content: (
                    <div className='ContextBox__table__item-aggregated_labels'>
                      <UI.Label
                        className='ContextBox__table__item-aggregated_label'
                        iconLeft={
                          <UI.Tooltip tooltip={
                            'Minimum value'
                          }>
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
                        {min !== null && min !== undefined ? roundValue(min) : '-'}
                      </UI.Label>
                      <UI.Label
                        className='ContextBox__table__item-aggregated_label'
                        iconLeft={
                          <UI.Tooltip tooltip={
                            'Average value'
                          }>
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
                        {avg !== null && avg !== undefined ? roundValue(avg) : '-'}
                      </UI.Label>
                      <UI.Label
                        className='ContextBox__table__item-aggregated_label'
                        iconLeft={
                          <UI.Tooltip tooltip={
                            'Maximum value'
                          }>
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
                        {max !== null && max !== undefined ? roundValue(max) : '-'}
                      </UI.Label>
                    </div>
                  )
                },
                step: {
                  content: stepData !== null && stepData[1] !== null ? stepData[1] : '-',
                },
              },
              config: (
                <>
                  <GroupConfigPopup
                    config={traceModel.config}
                  />
                  {
                    this.context.traceList?.grouping?.chart?.length > 0 && (
                      <UI.Tooltip tooltip='Group Chart ID'>
                        <div className='ContextBox__table__group-indicator__chart'>
                          {traceModel.chart + 1}
                        </div>
                      </UI.Tooltip>
                    )
                  }
                  {
                    this.context.traceList?.grouping?.color?.length > 0 && (
                      <UI.Tooltip tooltip='Group Color'>
                        <div
                          className='ContextBox__table__group-indicator__color'
                          style={{
                            backgroundColor: traceModel.color,
                            borderColor: traceModel.color
                          }}
                        />
                      </UI.Tooltip>
                    )
                  }
                  {
                    this.context.traceList?.grouping?.stroke?.length > 0 && (
                      <UI.Tooltip tooltip='Group Stroke Style'>
                        <svg
                          className='ContextBox__table__group-indicator__stroke'
                          style={{
                            borderColor: this.context.traceList?.grouping?.color?.length > 0 ? traceModel.color : '#3b5896'
                          }}
                        >
                          <line
                            x1='0'
                            y1='50%'
                            x2='100%'
                            y2='50%'
                            style={{
                              strokeDasharray: traceModel.stroke.split(' ').map(elem => (elem / 5) * 3).join(' ')
                            }}
                          />
                        </svg>
                      </UI.Tooltip>
                    )
                  }
                </>
              )
            };

            for (let metricKey in this.context.runs?.aggMetrics) {
              this.context.runs?.aggMetrics[metricKey].forEach(metricContext => {
                const {min, avg, max} = traceModel.getAggregatedMetricMinMax(metricKey, metricContext);
                data[JSON.stringify(traceModel.config)].data[`${metricKey}-${JSON.stringify(metricContext)}`] = {
                  content: (
                    <div className='ContextBox__table__item-aggregated_labels'>
                      <UI.Label
                        className='ContextBox__table__item-aggregated_label'
                        iconLeft={
                          <UI.Tooltip tooltip={
                            'Minimum value'
                          }>
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
                        {min !== null && min !== undefined ? roundValue(min) : '-'}
                      </UI.Label>
                      <UI.Label
                        className='ContextBox__table__item-aggregated_label'
                        iconLeft={
                          <UI.Tooltip tooltip={
                            'Average value'
                          }>
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
                        {avg !== null && avg !== undefined ? roundValue(avg) : '-'}
                      </UI.Label>
                      <UI.Label
                        className='ContextBox__table__item-aggregated_label'
                        iconLeft={
                          <UI.Tooltip tooltip={
                            'Maximum value'
                          }>
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
                        {max !== null && max !== undefined ? roundValue(max) : '-'}
                      </UI.Label>
                    </div>
                  )
                };
              });
            }

            Object.keys(this.paramKeys).forEach(paramKey => this.paramKeys[paramKey].forEach(key => {
              const param = `params.${paramKey}.${key}`;
              if (traceModel.config.hasOwnProperty(param)) {
                data[JSON.stringify(traceModel.config)].data[param] = formatValue(traceModel.config[param]);
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
                data[JSON.stringify(traceModel.config)].data[param] = formatValue(value);
              }
            }));
          }
          data[JSON.stringify(traceModel.config)].items.push(row);
        } else {
          data.push(row);
        }
      });
    });

    return (
      <div className={classNames({
        ContextBox__content: true,
        resizing: this.props.resizing,
      })}>
        <div className='ContextBox__table__wrapper'>
          <UI.Table
            name='context'
            topHeader
            columns={columns}
            data={data}
            groups={this.context.traceList?.traces.length > 1}
            expanded={expanded}
            forcePinnedColumns={this.state.forcePinnedColumns}
            updateForcePinnedColumns={this.updateForcePinnedColumns}
          />
        </div>
      </div>
    );
  };

  render() {
    return (
      <div className='ContextBox' style={{
        width: `${this.props.width}px`,
      }}>
        {this.context.runs.isLoading
          ? this._renderContentLoader()
          : this._renderContent()
        }
      </div>
    );
  }
}

ContextBox.propTypes = {};

ContextBox.contextType = HubMainScreenContext;

export default ContextBox;