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

  _renderItem = (runDictItem, hash, key) => {
    const index = this.context.contextStepIndex;
    const lineData = this.context.getLineDataByHash(hash);
    if (lineData === null || lineData.num_steps <= index) {
      return null;
    }

    const stepData = this.context.getLineDataByStep(lineData.data, index);
    if (stepData === null) {
      return null;
    }

    const color = this.context.getLineColor(lineData);
    const colorObj = Color(color);

    const className = classNames({
      ContextBox__table__item: true,
      active: this.context.contextActiveStepHash === hash,
    });

    let style = {};
    if (this.context.contextActiveStepHash === hash) {
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
              `${lineData.tag}: `
            }
            {!!lineData.date &&
              moment.unix(lineData.date).format('HH:mm · D MMM, YY')
            }
          </div>
        </td>
        <td>{this.formatValue(stepData.value)}</td>
        <td>
          {stepData.step}
        </td>
        <td>
          {stepData.epoch !== null && stepData.epoch}
        </td>
        {Object.keys(this.context.contextInformation.unionFields).map((n, nKey) => (
          this.context.contextInformation.unionFields[n].map((f, fKey) => (
            <td key={nKey * this.context.contextInformation.unionFields[n].length + fKey}>
              {runDictItem.data.hasOwnProperty(n) && runDictItem.data[n].hasOwnProperty(f)
                ? runDictItem.data[n][f]
                : '-'
              }
            </td>
          ))
        ))}
      </tr>
    );
  };

  _renderContent = () => {
    if (this.context.isLoading || this.context.isLoadingContext) {
      return <UI.Text type='grey' center spacingTop>Loading..</UI.Text>
    }

    if (!this.context.data || !this.context.data.length
      || !this.context.contextInformation.unionFields
      || !this.context.contextInformation.unionNamespaces) {
      return null;
    }

    return (
      <div className='ContextBox__content'>
        <div className='ContextBox__table__wrapper'>
          <table className='ContextBox__table' cellSpacing={0} cellPadding={0}>
            <thead>
              {this.context.contextInformation.unionNamespaces.length > 0 &&
                <tr className='ContextBox__table__header'>
                  <td key='run'/>
                  <td key='value' colSpan={3}/>
                  {Object.keys(this.context.contextInformation.unionFields).map((n, nKey) => (
                    <td key={nKey} colSpan={this.context.contextInformation.unionFields[n].length}>
                      {n}
                    </td>
                  ))}
                </tr>
              }
              <tr className='ContextBox__table__subheader'>
                <td>Run</td>
                <td>Value</td>
                <td>Step</td>
                <td>Epoch</td>
                {Object.values(this.context.contextInformation.unionFields).flat().map((f, fKey) => (
                  <td key={fKey}>
                    {f}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(this.context.contextInformation.data).map((runHash, runKey) => (
                this._renderItem(this.context.contextInformation.data[runHash], runHash, runKey)
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