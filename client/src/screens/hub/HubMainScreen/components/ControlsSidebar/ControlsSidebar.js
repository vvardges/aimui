import './ControlsSidebar.less';

import React, { useContext } from 'react';
import ContentLoader from 'react-content-loader';

import HubMainScreenContext from '../../HubMainScreenContext/HubMainScreenContext';
import UI from '../../../../../ui';
import ControlsSidebarToggleOutliers from './components/ControlsSidebarToggleOutliers/ControlsSidebarToggleOutliers';
import GroupByColor from './components/GroupByColor/GroupByColor';
import GroupByStyle from './components/GroupByStyle/GroupByStyle';
import GroupByChart from './components/GroupByChart/GroupByChart';
import Aggregate from './components/Aggregate/Aggregate';
import ControlsSidebarZoom from './components/ControlsSidebarZoom/ControlsSidebarZoom';
import ToggleParPlotIndicator from './components/ToggleParPlotIndicator/ToggleParPlotIndicator';
import ControlsSidebarToggleInterpolation from './components/ControlsSidebarToggleInterpolation/ControlsSidebarToggleInterpolation';
import ControlsSidebarExport from './components/ControlsSidebarExport/ControlsSidebarExport';

function ControlsSidebar() {
  let {
    runs, chart,
    contextFilter, setContextFilter, setChartSettingsState,
    enableExploreMetricsMode, enableExploreParamsMode
  } = useContext(HubMainScreenContext);

  const { groupByColor, groupByStyle, groupByChart, aggregated } = contextFilter;

  return (
    <div className='ControlsSidebar'>
      {runs.isLoading
        ? (
          <ContentLoader
            height={280}
            width={65}
            backgroundColor='#F3F3F3'
            foregroundColor='#ECEBEB'
          >
            <rect x='10' y='10' rx='4' ry='4' width='45' height='45' />
            <rect x='10' y='65' rx='4' ry='4' width='45' height='45' />
            <rect x='10' y='120' rx='4' ry='4' width='45' height='45' />
            <rect x='10' y='175' rx='4' ry='4' width='45' height='45' />
            <rect x='10' y='230' rx='4' ry='4' width='45' height='45' />
          </ContentLoader>
        ) : (
          <div className='ControlsSidebar__items'>
            <GroupByColor
              groupByColor={groupByColor}
              setContextFilter={setContextFilter}
            />
            <GroupByStyle
              groupByStyle={groupByStyle}
              setContextFilter={setContextFilter}
            />
            <GroupByChart
              groupByChart={groupByChart}
              setContextFilter={setContextFilter}
            />
            {enableExploreMetricsMode() && (
              <>
                <Aggregate
                  aggregated={aggregated}
                  setContextFilter={setContextFilter}
                  disabled={groupByColor.length === 0 && groupByStyle.length === 0 && groupByChart.length === 0}
                />
                <UI.Line/>
                <ControlsSidebarToggleOutliers
                  disabled={runs.isLoading || runs.isEmpty}
                  settings={chart.settings}
                  setChartSettingsState={setChartSettingsState}
                />
                <ControlsSidebarToggleInterpolation
                  disabled={runs.isLoading || runs.isEmpty}
                  settings={chart.settings}
                  setChartSettingsState={setChartSettingsState}
                />
                <UI.Line/>
                <ControlsSidebarZoom
                  settings={chart.settings}
                  setChartSettingsState={setChartSettingsState}
                />
              </>
            )}
            {enableExploreParamsMode() && (
              <>
                <UI.Line/>
                <ControlsSidebarToggleInterpolation
                  disabled={runs.isLoading || runs.isEmpty}
                  settings={chart.settings}
                  setChartSettingsState={setChartSettingsState}
                />
                <ToggleParPlotIndicator
                  disabled={(runs.params.length + Object.keys(runs.aggMetrics).length <= 1)}
                  settings={chart.settings}
                  setChartSettingsState={setChartSettingsState}
                />
              </>
            )}

            {/* <ControlsSidebarExport
                disabled={runs.isLoading || runs.isEmpty}
              /> */}
          </div>
        )
      }
    </div>
  );
}

ControlsSidebar.propTypes = {};

export default ControlsSidebar;