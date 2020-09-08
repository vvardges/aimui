import './ContextBox.less';

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Color from 'color';
import moment from 'moment';

import HubMainScreenContext from '../../HubMainScreenContext/HubMainScreenContext';
import { buildUrl, classNames, sortOnKeys } from '../../../../../utils';
import UI from '../../../../../ui';
import { HUB_PROJECT_EXPERIMENT } from '../../../../../constants/screens';
import ContextTrace from './components/ContextTrace/ContextTrace';
import ColumnGroupPopup from './components/ColumnGroupPopup/ColumnGroupPopup';


class ContextBox extends Component {
  paramKeys = {};
  tableColsCount = 5;

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

  formatValue = (v) => {
    return v ? Math.round(v * 10e6) / 10e6 : 0;
  };

  _renderRow = (run, metric, trace, groupColor) => {
    const step = this.context.chart.focused.step;
    const contextHash = this.context.contextToHash(trace.context);

    const line = this.context.getTraceData(run.run_hash, metric.name, contextHash);

    let stepData = null;
    stepData = this.context.getMetricStepDataByStepIdx(line.data, step);
    // if (line.data.length > 0 && step > line.data[line.data.length-1][1]) {
    //   stepData = this.context.getMetricStepDataByStepIdx(line.data, line.data[line.data.length-1][1]);
    // } else {
    //   stepData = this.context.getMetricStepDataByStepIdx(line.data, step);
    // }

    const color = groupColor || this.context.getMetricColor(line.run, line.metric, line.trace);
    const colorObj = Color(color);

    const focusedCircle = this.context.chart.focused.circle;
    const focusedMetric = this.context.chart.focused.metric;
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
      ContextBox__table__item: true,
      active: active,
    });

    let style = {};
    if (active) {
      style = {
        backgroundColor: colorObj.alpha(0.15).hsl().string(),
      };
    }

    function highlightColumn(evt) {
      let { cellIndex, parentNode } = evt.currentTarget;
      let index = cellIndex + 1;
      window.requestAnimationFrame(() => {
        // Select all cells of current cell's column
        let columnCells = parentNode.parentNode.querySelectorAll(`td:nth-child(${index})`);
        columnCells.forEach(cell => {
          if (cell) {
            cell.style.backgroundColor = style.backgroundColor;
          }
        });
      });
    }

    function removeColumnHighlighting(evt) {
      let { cellIndex, parentNode } = evt.currentTarget;
      let index = cellIndex + 1;
      window.requestAnimationFrame(() => {
        // Select all cells of current cell's column
        let columnCells = parentNode.parentNode.querySelectorAll(`td:nth-child(${index})`);
        columnCells.forEach(cell => {
          if (cell) {
            cell.style.backgroundColor = 'inherit';
          }
        });
      });
    }

    function formatParamValue(value) {
      if (value === undefined) {
        return '-';
      }
      if (value === null) {
        return 'None';
      }
      if (value === true) {
        return 'True';
      }
      if (value === false) {
        return 'False';
      }

      return JSON.stringify(value);
    }

    // if (!this.context.isTFSummaryScalar(lineData)) {
    //   return null;
    // }

    return (
      <tr
        key={`${run.run_hash}_${metric.name}_${contextHash}`}
        className={className}
        style={style}
        onMouseMove={() => this.handleRowMove(run.run_hash, metric.name, contextHash)}
        onClick={() => this.handleRowClick(run.run_hash, metric.name, contextHash)}
      >
        <td
          style={{
            backgroundColor: active ? color : '#FFF'
          }}
        >
          <div
            className='ContextBox__table__item__run'
            style={{
              color: active ? '#FFF' : color,
            }}
          >
            <div className='ContextBox__table__item__tag__dot' style={{ backgroundColor: color }} />
            {this.context.isTFSummaryScalar(run)
              ? this._renderTFRowName(metric)
              : this._renderAimRowName(run, metric, trace)
            }
          </div>
        </td>
        <td
          onMouseMove={highlightColumn}
          onMouseLeave={removeColumnHighlighting}
        >
          {stepData !== null && stepData[0] !== null ? this.formatValue(stepData[0]) : '-'}
        </td>
        <td
          onMouseMove={highlightColumn}
          onMouseLeave={removeColumnHighlighting}
        >
          {stepData !== null && stepData[1] !== null ? stepData[1] : '-'}
        </td>
        <td
          onMouseMove={highlightColumn}
          onMouseLeave={removeColumnHighlighting}
        >
          {stepData !== null && stepData[2] !== null ? stepData[2] : '-'}
        </td>
        <td
          onMouseMove={highlightColumn}
          onMouseLeave={removeColumnHighlighting}
        >
          {stepData !== null && stepData[3] !== null ? moment.unix(stepData[3]).format('HH:mm:ss · D MMM, YY') : '-'}
        </td>
        {
          Object.keys(this.paramKeys).map(paramKey => this.paramKeys[paramKey].map(key => (
            <td
              key={key}
              onMouseMove={highlightColumn}
              onMouseLeave={removeColumnHighlighting}
            >
              {formatParamValue(run.params?.[paramKey]?.[key])}
            </td>
          )))
        }
      </tr>
    );
  };

  _renderAimRowName = (run, metric, trace) => {
    return (
      <Link
        className='ContextBox__table__item__name'
        to={buildUrl(HUB_PROJECT_EXPERIMENT, {
          experiment_name: run.experiment_name,
          commit_id: run.run_hash,
        })}
      >
        {run.experiment_name}/
        {metric.name}
        {!!trace.context &&
          <>
            {' ['}
            <div className='ContextBox__table__item__context'>
              {Object.keys(trace.context).map((contextCat, contextCatKey) =>
                <UI.Text inline key={contextCatKey}>{contextCat}: {trace.context[contextCat]}</UI.Text>
              )}
            </div>
            {']'}
          </>
        }
      </Link>
    )
  };

  _renderTFRowName = (metric) => {
    return (
      <>TF:{metric.name}</>
    )
  };

  // _renderRowParams = (param, paramName) => {
  //   if (Array.isArray(param)) {
  //     return <UI.Text>{paramName}={JSON.stringify(param)}</UI.Text>
  //   } else if (typeof param === 'boolean') {
  //     return <UI.Text>{paramName}={param ? 'true' : 'false'}</UI.Text>
  //   } else if (typeof param === 'object') {
  //     if (Object.keys(param).length === 0) {
  //       return null;
  //     }

  //     return (
  //       <div className='ContextBox__param__items'>
  //         {!!paramName &&
  //           <UI.Text className='ContextBox__param__items__name'>{paramName}:</UI.Text>
  //         }
  //         {Object.keys(param).map((paramName, paramValKey) =>
  //           <div
  //             className='ContextBox__param__item'
  //             key={paramValKey}
  //           >
  //             {this._renderRowParams(param[paramName], paramName)}
  //           </div>
  //         )}
  //       </div>
  //     )
  //   } else {
  //     return <UI.Text>{paramName}={param}</UI.Text>
  //   }
  // };

  _renderRows = () => {
    const step = this.context.chart.focused.step;

    return (
      <>
        {this.context.traceList?.traces.map((trace, index) => (
          <ContextTrace
            key={index}
            trace={trace}
            formatValue={this.formatValue}
            step={step}
            colsCount={this.tableColsCount}
          >
            {trace.series.map(series =>
              this._renderRow(
                series.run,
                series.metric,
                series.trace,
                this.context.traceList?.grouping?.color?.length > 0 ? trace.color : null
              )
            )}
          </ContextTrace>
        ))}
      </>
    );
  };

  _renderContent = () => {
    if (this.context.runs.isLoading) {
      return <UI.Text type='grey' center spacingTop>Loading..</UI.Text>
    }

    if (this.context.runs.isEmpty || !this.context.runs.data.length) {
      return null;
    }

    this.paramKeys = {};
    this.tableColsCount = 5;

    this.context.traceList?.traces.forEach(trace => {
      trace.series.forEach(series => {
        Object.keys(series?.run.params).forEach(paramKey => {
          if (!this.paramKeys.hasOwnProperty(paramKey)) {
            this.paramKeys[paramKey] = [];
          }
          Object.keys(series?.run.params[paramKey]).forEach(key => {
            if (!this.paramKeys[paramKey].includes(key)) {
              this.paramKeys[paramKey].push(key);
              this.tableColsCount++;
            }
          });
        });
      });
    });

    this.paramKeys = sortOnKeys(this.paramKeys);

    return (
      <div className='ContextBox__content'>
        <div className='ContextBox__table__wrapper'>
          <table className='ContextBox__table' cellSpacing={0} cellPadding={0}>
            <thead>
              <tr className='ContextBox__table__topheader'>
                <th colSpan={5}>
                  <UI.Text overline>Metrics</UI.Text>
                </th>
                {
                  Object.keys(this.paramKeys).map(paramKey => (
                    <th key={paramKey} colSpan={this.paramKeys[paramKey].length}>
                      <UI.Text overline>{paramKey}</UI.Text>
                    </th>
                  ))
                }
              </tr>
              <tr className='ContextBox__table__subheader'>
                <th>
                  <div className='ContextBox__table__subheader__item'>
                    <UI.Text overline>Metric</UI.Text>
                    <ColumnGroupPopup
                      param='metric'
                      contextFilter={this.context.contextFilter}
                      setContextFilter={this.context.setContextFilter}
                    />
                  </div>
                </th>
                <th>
                  <UI.Text overline>Value</UI.Text>
                </th>
                <th>
                  <UI.Text overline>Step</UI.Text>
                </th>
                <th>
                  <UI.Text overline>Epoch</UI.Text>
                </th>
                <th>
                  <UI.Text overline>Time</UI.Text>
                </th>
                {
                  Object.keys(this.paramKeys).map(paramKey => this.paramKeys[paramKey].map(key => (
                    <th key={key}>
                      <div className='ContextBox__table__subheader__item'>
                        <UI.Text overline>{key}</UI.Text>
                        <ColumnGroupPopup
                          param={`params.${paramKey}.${key}`}
                          contextFilter={this.context.contextFilter}
                          setContextFilter={this.context.setContextFilter}
                        />
                      </div>
                    </th>
                  )))
                }
              </tr>
            </thead>
            {this._renderRows()}
          </table>
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