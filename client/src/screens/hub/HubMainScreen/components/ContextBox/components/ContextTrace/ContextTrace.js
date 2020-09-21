import React, { useState, useContext } from 'react';
import HubMainScreenContext from '../../../../HubMainScreenContext/HubMainScreenContext';
import UI from '../../../../../../../ui';
import { formatValue, roundValue } from '../../../../../../../utils';

function ContextTrace(props) {
  let [expanded, setExpanded] = useState(true);
  let hubMainScreenContext = useContext(HubMainScreenContext);

  const { trace, step, colsCount, theadHeight } = props;

  return (
    <tbody>
      {
        hubMainScreenContext.traceList?.traces.length > 1 && (
          <tr>
            <td
              className='ContextBox__table__group-indicator'
              style={{ top: theadHeight }}
            >
              <div>
                <div
                  className='ContextBox__table__group-indicator__toggle'
                  onClick={e => setExpanded(!expanded)}
                >
                  <UI.Icon 
                    i={expanded ? 'unfold_less' : 'unfold_more'}
                    scale={1}
                    className='ContextBox__table__group-indicator__toggle__icon' 
                  />
                </div>
                {
                  hubMainScreenContext.traceList?.grouping?.chart?.length > 0 && (
                    <div className='ContextBox__table__group-indicator__chart'>
                      <UI.Text small>{trace.chart + 1}</UI.Text>
                    </div>
                  )
                }
                {
                  hubMainScreenContext.traceList?.grouping?.color?.length > 0 && (
                    <div
                      className='ContextBox__table__group-indicator__color'
                      style={{
                        backgroundColor: trace.color,
                        borderColor: trace.color
                      }}
                    />
                  )
                }
                {
                  hubMainScreenContext.traceList?.grouping?.stroke?.length > 0 && (
                    <svg
                      className='ContextBox__table__group-indicator__stroke'
                      style={{
                        borderColor: trace.color
                      }}
                    >
                      <line
                        x1='0'
                        y1='50%'
                        x2='100%'
                        y2='50%'
                        style={{
                          strokeDasharray: trace.stroke.split(' ').map(elem => (elem / 5) * 3).join(' ')
                        }}
                      />
                    </svg>
                  )
                }
                <div className='ContextBox__table__group-indicator__props'>
                  {Object.keys(trace.config).map(configName =>
                    <div 
                      key={configName}
                      title={`${configName}=${formatValue(trace.config[configName])}`}
                    >
                      <UI.Text small>
                        {configName}={formatValue(trace.config[configName])}
                      </UI.Text>
                    </div>
                  )}
                </div>
              </div>
            </td>
            <td
              className='ContextBox__table__group-indicator__placeholder'
              colSpan={colsCount - 4}
              style={{ top: theadHeight }}
            />
            <td
              className='ContextBox__table__group-aggregation'
              colSpan={3}
              style={{ top: theadHeight }}
            >
              <div className='ContextBox__table__group-aggregation__data'>
                <div className='ContextBox__table__group-aggregation__data__item'>
                  <UI.Text small>
                    Min: {roundValue(
                      hubMainScreenContext.getMetricStepDataByStepIdx(trace.aggregation.min.trace.data, step)?.[0]
                    ) || '-'}
                  </UI.Text>
                </div>
                <div className='ContextBox__table__group-aggregation__data__item'>
                  <UI.Text small>
                    Avg: {roundValue(
                      hubMainScreenContext.getMetricStepDataByStepIdx(trace.aggregation.avg.trace.data, step)?.[0]
                    ) || '-'}
                  </UI.Text>
                </div>
                <div className='ContextBox__table__group-aggregation__data__item'>
                  <UI.Text small>
                    Max: {roundValue(
                      hubMainScreenContext.getMetricStepDataByStepIdx(trace.aggregation.max.trace.data, step)?.[0]
                    ) || '-'}
                  </UI.Text>
                </div>
              </div>
            </td>
          </tr>
        )
      }
      {hubMainScreenContext.traceList?.traces.length > 1 ? expanded && props.children : props.children}
    </tbody>
  );
}

export default ContextTrace;