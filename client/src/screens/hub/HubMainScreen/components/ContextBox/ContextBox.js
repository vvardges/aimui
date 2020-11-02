import './ContextBox.less';

import React, { Component, createRef } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Color from 'color';
import moment from 'moment';
import * as _ from 'lodash';

import HubMainScreenContext from '../../HubMainScreenContext/HubMainScreenContext';
import { buildUrl, classNames, sortOnKeys, formatValue, roundValue } from '../../../../../utils';
import UI from '../../../../../ui';
import { HUB_PROJECT_EXPERIMENT } from '../../../../../constants/screens';
import ColumnGroupPopup from './components/ColumnGroupPopup/ColumnGroupPopup';

class ContextBox extends Component {
  paramKeys = {};
  tableColsCount = 5;
  theadRef = createRef();

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
  };

  // _renderRows = () => {
  //   const step = this.context.chart.focused.step;

  //   return (
  //     <>
  //       {this.context.traceList?.traces.map((trace, index) => (
  //         <ContextTrace
  //           key={index}
  //           trace={trace}
  //           step={step}
  //           colsCount={this.tableColsCount}
  //           theadHeight={this.theadRef.current?.getBoundingClientRect()?.height}
  //         >
  //           {trace.series.map(series =>
  //             this._renderRow(
  //               series.run,
  //               series.metric,
  //               series.trace,
  //               this.context.traceList?.grouping?.color?.length > 0 ? trace.color : null
  //             )
  //           )}
  //         </ContextTrace>
  //       ))}
  //     </>
  //   );
  // };

  _renderContent = () => {
    if (this.context.runs.isLoading) {
      return <UI.Text type='grey' center spacingTop>Loading..</UI.Text>;
    }

    if (this.context.runs.isEmpty || !this.context.runs.data.length) {
      return null;
    }

    this.paramKeys = {};
    this.tableColsCount = 5;

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
                this.tableColsCount++;
              }
            });
          }
        });
      });
    });

    this.paramKeys = sortOnKeys(this.paramKeys);

    const columns = [
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
        stick: 'left'
      },
      {
        key: 'run',
        content: <UI.Text overline>Run</UI.Text>,
        topHeader: 'Metrics',
        stick: 'left'
      },
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
        stick: 'left'
      },
      {
        key: 'context',
        content: <UI.Text overline>Context</UI.Text>,
        topHeader: 'Metrics',
        stick: 'left'
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
    ];

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
    const step = this.context.chart.focused.step;
    const focusedCircle = this.context.chart.focused.circle;
    const focusedMetric = this.context.chart.focused.metric;

    this.context.traceList?.traces.forEach((traceModel, index) => {
      traceModel.series.forEach(series => {
        const { run, metric, trace } = series;
        const contextHash = this.context.contextToHash(trace.context);

        const line = this.context.getTraceData(run.run_hash, metric.name, contextHash);

        let stepData = null;
        stepData = this.context.getMetricStepDataByStepIdx(line.data, step);

        const color = this.context.traceList?.grouping?.color?.length > 0 ? traceModel.color : this.context.getMetricColor(line.run, line.metric, line.trace);
        const colorObj = Color(color);

        let active = false;
        if ((
          focusedCircle.runHash === run.run_hash
          && focusedCircle.metricName === metric.name
          && focusedCircle.traceContext === contextHash)
          || (
            focusedMetric.runHash === run.run_hash
            && focusedMetric.metricName === metric.name
            && focusedMetric.traceContext === contextHash)) {
          active = true;
        }

        const className = classNames({
          ContextBox__table__cell: true,
          active: active,
        });

        let style = {};
        if (active) {
          style = {
            backgroundColor: colorObj.alpha(0.15).hsl().string(),
          };
        }

        const highlightColumn = (evt) => {
          this.handleRowMove(run.run_hash, metric.name, contextHash);
          evt.currentTarget.parentNode.style.backgroundColor = style.backgroundColor;
        };

        function removeColumnHighlighting(evt) {
          evt.currentTarget.parentNode.style.backgroundColor = 'inherit';
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
              onClick: () => this.handleRowClick(run.run_hash, metric.name, contextHash),
              onMouseMove: () => this.handleRowMove(run.run_hash, metric.name, contextHash),
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
              onClick: () => this.handleRowClick(run.run_hash, metric.name, contextHash),
              onMouseMove: () => this.handleRowMove(run.run_hash, metric.name, contextHash),
            }
          },
          metric: {
            content: metric.name,
            style: {
              color: active ? '#FFF' : color,
              backgroundColor: active ? color : '#FAFAFA'
            },
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric.name, contextHash),
              onMouseMove: () => this.handleRowMove(run.run_hash, metric.name, contextHash),
            }
          },
          context: {
            content: !!trace.context &&
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
                        <UI.Text inline>{contextCat}={formatValue(trace.context[contextCat])}</UI.Text>
                      </UI.Button>
                    )}
                    contextFilter={this.context.contextFilter}
                    setContextFilter={this.context.setContextFilter}
                  />
                ))}
              </div>
            ,
            style: {
              backgroundColor: active ? color : '#FAFAFA'
            },
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric.name, contextHash),
              onMouseMove: () => this.handleRowMove(run.run_hash, metric.name, contextHash),
            }
          },
          value: {
            content: stepData !== null && stepData[0] !== null ? roundValue(stepData[0]) : '-',
            style: style,
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric.name, contextHash),
              onMouseMove: highlightColumn,
              onMouseLeave: removeColumnHighlighting
            }
          },
          step: {
            content: stepData !== null && stepData[1] !== null ? stepData[1] : '-',
            style: style,
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric.name, contextHash),
              onMouseMove: highlightColumn,
              onMouseLeave: removeColumnHighlighting
            }
          },
          epoch: {
            content: stepData !== null && stepData[2] !== null ? stepData[2] : '-',
            style: style,
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric.name, contextHash),
              onMouseMove: highlightColumn,
              onMouseLeave: removeColumnHighlighting
            }
          },
          time: {
            content: stepData !== null && stepData[3] !== null ? moment.unix(stepData[3]).format('HH:mm:ss · D MMM, YY') : '-',
            style: style,
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric.name, contextHash),
              onMouseMove: highlightColumn,
              onMouseLeave: removeColumnHighlighting
            }
          }
        };

        Object.keys(this.paramKeys).forEach(paramKey => this.paramKeys[paramKey].forEach(key => {
          row[`params.${paramKey}.${key}`] = {
            content: formatValue(run.params?.[paramKey]?.[key]),
            style: style,
            props: {
              onClick: () => this.handleRowClick(run.run_hash, metric.name, contextHash),
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
            data[JSON.stringify(traceModel.config)] = {
              items: [],
              data: {
                experiment: {
                  content: (
                    <UI.Label className='ContextBox__table__item-aggregated_label' color={color}>
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
                    <UI.Label className='ContextBox__table__item-aggregated_label' color={color}>
                      {traceModel?.series?.length} run{traceModel.series.length > 1 ? 's' : ''}
                    </UI.Label>
                  ),
                  expandable: true
                },
                metric: {
                  content: (
                    <UI.Label className='ContextBox__table__item-aggregated_label' color={color}>
                      {traceModel.metrics.length === 1 ? traceModel.metrics[0] : (
                        <UI.Tooltip tooltip={traceModel.metrics.join(', ')}>
                          {traceModel.metrics.length} metrics
                        </UI.Tooltip>
                      )}
                    </UI.Label>
                  ),
                  expandable: true
                },
                value: `min: ${min !== null && min !== undefined ? roundValue(min) : '-'} / avg: ${avg !== null && avg !== undefined ? roundValue(avg) : '-'} / max: ${max !== null && max !== undefined ? roundValue(max) : '-'}`,
                step: {
                  content: stepData !== null && stepData[1] !== null ? stepData[1] : '-',
                },
              },
              config: (
                <>
                  {
                    this.context.traceList?.grouping?.chart?.length > 0 && (
                      <div className='ContextBox__table__group-indicator__chart'>
                        <UI.Text small>{traceModel.chart + 1}</UI.Text>
                      </div>
                    )
                  }
                  {
                    this.context.traceList?.grouping?.color?.length > 0 && (
                      <div
                        className='ContextBox__table__group-indicator__color'
                        style={{
                          backgroundColor: traceModel.color,
                          borderColor: traceModel.color
                        }}
                      />
                    )
                  }
                  {
                    this.context.traceList?.grouping?.stroke?.length > 0 && (
                      <svg
                        className='ContextBox__table__group-indicator__stroke'
                        style={{
                          borderColor: traceModel.color
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
                    )
                  }
                </>
              )
            };

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
            topHeader
            columns={columns}
            data={data}
            groups={this.context.traceList?.traces.length > 1}
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
        {this._renderContent()}
      </div>
    );
  }
}

ContextBox.propTypes = {};

ContextBox.contextType = HubMainScreenContext;

export default ContextBox;