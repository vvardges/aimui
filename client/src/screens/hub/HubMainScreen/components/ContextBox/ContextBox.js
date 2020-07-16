import './ContextBox.less';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Color from 'color';
import moment from 'moment';

import HubMainScreenContext from '../../HubMainScreenContext/HubMainScreenContext';
import { classNames } from '../../../../../utils';
import UI from '../../../../../ui';


class ContextBox extends Component {
  formatValue = (v) => {
    return v ? Math.round(v * 10e6) / 10e6 : 0;
  };

  _renderItem = (hash, runDictItem) => {
    const index = this.context.chart.focused.index;
    const lineData = this.context.getMetricByHash(hash);
    if (lineData === null) {
      return null;
    }

    const stepData = this.context.getMetricStepDataByStepIdx(lineData.data, index);

    const color = this.context.getMetricColor(lineData);
    const colorObj = Color(color);

    const circleMetricIndex = this.context.chart.focused.circle.metricIndex;
    let active = false;
    if (this.context.chart.focused.metric.hash === hash
      || (circleMetricIndex !== null && this.context.metrics.data[circleMetricIndex] !== null
        && this.context.metrics.data[circleMetricIndex].hash === hash)) {
      active = true;
    }

    const className = classNames({
      ContextBox__table__item: true,
      active: active,
    });

    let style = {};
    if (active) {
      style = {
        borderLeftColor: color,
        backgroundColor: colorObj.alpha(0.1).hsl().string(),
      };
    }

    return (
      <tr className={className} style={style} key={hash}>
        <td>
          <div
            className='ContextBox__table__item__run'
            style={{
              color: color,
            }}
          >
            <div className='ContextBox__table__item__tag__dot' style={{ backgroundColor: color }} />
            {!!lineData.tag &&
              `${lineData.tag.name}: `
            }
            {!!lineData.date &&
              moment.unix(lineData.date).format('HH:mm · D MMM, YY')
            }
          </div>
        </td>
        <td>
          {stepData !== null ? this.formatValue(stepData.value) : '-'}
        </td>
        <td>
          {stepData !== null ? stepData.step : '-'}
        </td>
        <td>
          {stepData !== null && stepData.epoch !== null ? stepData.epoch : '-'}
        </td>
        {!!runDictItem && this.context.isAimRun(lineData) &&
        Object.keys(this.context.params.unionFields).map((n, nKey) => (
          this.context.params.unionFields[n].map((f, fKey) => (
            <td key={nKey * this.context.params.unionFields[n].length + fKey}>
              {runDictItem.data.hasOwnProperty(n) && runDictItem.data[n].hasOwnProperty(f)
                ? runDictItem.data[n][f]
                : '-'
              }
            </td>
          ))
        ))}
        {this.context.isTFSummaryScalar(lineData) &&
          <td colSpan={Object.values(this.context.params.unionFields).flat().length || 1}>
            {lineData.name}
          </td>
        }
      </tr>
    );
  };

  doesAimMetricExist = () => {
    for (let m in this.context.metrics.data) {
      if (this.context.isAimRun(this.context.metrics.data[m])) {
        return true;
      }
    }
  };

  _renderTableHeaderParams = () => {
    if (!this.context.metrics.data.length) {
      return null;
    }

    if (!this.doesAimMetricExist()) {
      return <td />;
    }

    return (
      <>
        {Object.keys(this.context.params.unionFields).map((n, nKey) => (
          <td key={nKey} colSpan={this.context.params.unionFields[n].length}>
            {n}
          </td>
        ))}
      </>
    )
  };

  _renderTableSubHeaderParams = () => {
    if (!this.context.metrics.data.length) {
      return null;
    }

    if (!this.doesAimMetricExist()) {
      return <td>Name / Params</td>;
    }

    return (
      <>
        {Object.values(this.context.params.unionFields).flat().map((f, fKey) => (
          <td key={fKey}>
            {f}
          </td>
        ))}
      </>
    )
  };

  _renderContent = () => {
    if (this.context.metrics.isLoading || this.context.params.isLoading) {
      return <UI.Text type='grey' center spacingTop>Loading..</UI.Text>
    }

    if (!this.context.metrics.data || !this.context.metrics.data.length
      || !this.context.params.unionFields
      || !this.context.params.unionNamespaces) {
      return null;
    }

    return (
      <div className='ContextBox__content'>
        <div className='ContextBox__table__wrapper'>
          <table className='ContextBox__table' cellSpacing={0} cellPadding={0}>
            <thead>
              {this.context.params.unionNamespaces.length > 0 &&
                <tr className='ContextBox__table__header'>
                  <td key='run'/>
                  <td key='value' colSpan={3}/>
                  {this._renderTableHeaderParams()}
                </tr>
              }
              <tr className='ContextBox__table__subheader'>
                <td>Run</td>
                <td>Value</td>
                <td>Step</td>
                <td>Epoch</td>
                {this._renderTableSubHeaderParams()}
              </tr>
            </thead>
            <tbody>
              {Object.keys(this.context.params.data).map((runHash) => (
                this._renderItem(runHash, this.context.params.data[runHash])
              ))}
              {this.context.getTFSummaryScalars().map((s) => (
                this._renderItem(s.hash, null)
              ))}
            </tbody>
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