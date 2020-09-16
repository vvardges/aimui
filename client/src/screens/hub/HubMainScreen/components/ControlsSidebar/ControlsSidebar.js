import './ControlsSidebar.less';

import React, { useContext } from 'react';
import HubMainScreenContext from '../../HubMainScreenContext/HubMainScreenContext';
import ControlsSidebarExport from './components/ControlsSidebarExport/ControlsSidebarExport';
import ControlsSiderbarToggleOutliers from './components/ControlsSidebarToggleOutliers/ControlsSidebarToggleOutliers';
import GroupByColor from './components/GroupByColor/GroupByColor';
import GroupByStyle from './components/GroupByStyle/GroupByStyle';
import GroupByChart from './components/GroupByChart/GroupByChart';
import Aggregate from './components/Aggregate/Aggregate';
import UI from '../../../../../ui';
import ControlsSidebarZoom from './components/ControlsSidebarZoom/ControlsSidebarZoom';

function ControlsSidebar() {
  let { contextFilter, setContextFilter, runs, chart, toggleOutliers, setChartSettingsState } = useContext(HubMainScreenContext);

  const { groupByColor, groupByStyle, groupByChart, aggregated } = contextFilter;

  return (
    <div className='ControlsSidebar'>
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
        <Aggregate
          aggregated={aggregated}
          setContextFilter={setContextFilter}
          disabled={groupByColor.length === 0 && groupByStyle.length === 0 && groupByChart.length === 0}
        />
        <UI.Line />
        <ControlsSiderbarToggleOutliers 
          disabled={runs.isLoading || runs.isEmpty}
          displayOutliers={chart.settings.displayOutliers}
          toggleOutliers={toggleOutliers}
        />
        <UI.Line />
        <ControlsSidebarZoom
          zoomMode={chart.settings.zoomMode}
          zoom={chart.settings.zoom}
          zoomHistory={chart.settings.zoomHistory}
          setChartSettingsState={setChartSettingsState}
        />
        {/* <ControlsSidebarExport 
          disabled={runs.isLoading || runs.isEmpty} 
        /> */}
      </div>
    </div>
  );
}

ControlsSidebar.propTypes = {};

export default ControlsSidebar;