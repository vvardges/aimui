import './HubMainScreen.less';

import React from 'react';
import { Helmet } from 'react-helmet';
import { withRouter } from 'react-router-dom';
import * as _ from 'lodash';
import Color from 'color';

import ProjectWrapper from '../../../wrappers/hub/ProjectWrapper/ProjectWrapper';
import * as classes from '../../../constants/classes';
import * as screens from '../../../constants/screens';
import * as storeUtils from '../../../storeUtils';
import HubMainScreenContext from './HubMainScreenContext/HubMainScreenContext';
import { setItem, getItem, removeItem } from '../../../services/storage';
import { USER_LAST_SEARCH_QUERY, AIM_QL_VERSION, USER_LAST_EXPLORE_CONFIG, EXPLORE_PANEL_FLEX_STYLE } from '../../../config';
import Panel from './components/Panel/Panel';
import SearchBar from '../../../components/hub/SearchBar/SearchBar';
import ContextBox from './components/ContextBox/ContextBox';
import ControlsSidebar from './components/ControlsSidebar/ControlsSidebar';
import { randomStr, deepEqual, buildUrl, getObjectValueByPath, classNames, sortOnKeys } from '../../../utils';
import * as analytics from '../../../services/analytics';
import TraceList from './models/TraceList';
import SelectForm from './components/SelectForm/SelectForm';
import { COLORS } from '../../../constants/colors';

class HubMainScreen extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      height: 0,
      width: 0,
      resizing: false,
      panelFlex: getItem(EXPLORE_PANEL_FLEX_STYLE),

      // Context state
      context: {
        // Chart config
        chart: {
          focused: {
            step: null,
            metric: {
              runHash: null,
              metricName: null,
              traceContext: null,
            },
            circle: {
              active: false,
              runHash: null,
              metricName: null,
              traceContext: null,
              step: null,
            },
          },
          settings: {
            yScale: 0,
            zoomMode: false,
            zoomHistory: [],
            persistent: {
              displayOutliers: false,
              zoom: null,
              interpolate: false,
              indicator: true,
            }
          },
        },

        // Chart data - runs
        runs: {
          isLoading: false,
          isEmpty: true,
          data: null,
          params: [],
          aggMetrics: {},
          meta: null,
        },

        // Search
        search: {
          query: undefined,
          v: AIM_QL_VERSION,
        },
        searchInput: {
          value: undefined,
          selectInput: '',
          selectConditionInput: '',
        },

        // Filter panel
        contextFilter: {
          groupByColor: [],
          groupByStyle: [],
          groupByChart: [],
          aggregated: false
        },

        traceList: null,

        // Unique key to re-render svg on chart or runs states update
        key: null,
      },
    };

    this.projectWrapperRef = React.createRef();
    this.searchBarRef = React.createRef();

    this.URLStateParams = [
      'chart.focused.circle',
      'chart.settings.persistent',
      'search',
      'contextFilter'
    ];

    this.defaultSearchQuery = 'loss';
  }

  componentWillMount() {
    this.props.resetProgress();
  }

  componentDidMount() {
    this.props.completeProgress();
    this.updateWindowDimensions();
    window.addEventListener('resize', this.updateWindowDimensions);
    this.recoverStateFromURL(window.location.search);

    // Analytics
    analytics.pageView('search');
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.location !== prevProps.location) {
      this.recoverStateFromURL(location.search);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowDimensions);
    document.removeEventListener('mouseup', this.endResize);
    document.removeEventListener('mousemove', this.resizeHandler);
  }

  getInitialControls = () => {
    return {
      // Chart config
      chart: {
        settings: {
          yScale: 0,
          zoomMode: false,
          zoomHistory: [],
          persistent: {
            displayOutliers: false,
            zoom: null,
            interpolate: false,
            indicator: true,
          }
        },
      },

      // Filter panel
      contextFilter: {
        groupByColor: [],
        groupByStyle: [],
        groupByChart: [],
        aggregated: false
      },
    };
  };

  resetControls = () => {
    let initialControls = this.getInitialControls();
    this.setState(prevState => ({
      context: {
        ...prevState.context,
        chart: {
          ...prevState.context.chart,
          settings: initialControls.chart.settings,
        },
        contextFilter: initialControls.contextFilter
      }
    }), () => {
      this.updateURL();
      this.groupRuns();
      removeItem(USER_LAST_EXPLORE_CONFIG);
    });
  };

  areControlsChanged = () => {
    return !_.isEqual(
      {
        chart: {
          settings: this.state.context.chart.settings
        },
        contextFilter: this.state.context.contextFilter
      },
      this.getInitialControls()
    );
  };

  updateWindowDimensions = () => {
    const wrapper = this.projectWrapperRef.current;
    const projectWrapperHeight = wrapper ? this.projectWrapperRef.current.getHeaderHeight() : null;
    if (projectWrapperHeight !== null) {
      this.setState({
        height: window.innerHeight - projectWrapperHeight - 1,
        width: window.innerWidth,
      });
    } else {
      setTimeout(() => this.updateWindowDimensions(), 25);
    }
  };

  startResize = () => {
    document.addEventListener('mouseup', this.endResize);
    document.addEventListener('mousemove', this.resizeHandler);
    document.body.style.cursor = 'row-resize';
    this.setState({ resizing: true });
  };

  endResize = () => {
    document.removeEventListener('mouseup', this.endResize);
    document.removeEventListener('mousemove', this.resizeHandler);
    document.body.style.cursor = 'auto';
    this.setState({ resizing: false }, () => {
      setItem(EXPLORE_PANEL_FLEX_STYLE, this.state.panelFlex);
    });
  };

  resizeHandler = (evt) => {
    window.requestAnimationFrame(() => {
      const searchBarHeight = this.searchBarRef.current.clientHeight;
      const height = evt.clientY - this.projectWrapperRef.current.getHeaderHeight() - searchBarHeight;
      const flex = height / (this.state.height - searchBarHeight);
      this.setState({ panelFlex: flex });
    });
  };

  recoverStateFromURL = (search) => {
    if (!!search && search.indexOf('?search=') !== -1) {
      if (!this.isURLStateOutdated(search)) {
        return;
      }

      const state = this.URLSearchToState(search);
      if (state.search.v !== AIM_QL_VERSION) {
        return;
      }

      //   if (this.state.context.search.query === undefined && state.search.query === undefined) {
      //     state.search.query = this.defaultSearchQuery;
      //   }

      this.setContextFilter(state.contextFilter, this.groupRuns, false, false);
      if (!deepEqual(state.search, this.state.context.search)) {
        this.setSearchState(state.search, () => {
          this.searchByQuery(false).then(() => {
            this.setChartFocusedState(state.chart.focused, null, false);
            this.setChartSettingsState(state.chart.settings, null, false);
          });
        }, false, false);
      } else {
        this.setChartFocusedState(state.chart.focused, null, false);
        this.setChartSettingsState(state.chart.settings, null, false);
      }
    } else {
      let setSearchQuery = getItem(USER_LAST_SEARCH_QUERY);
      if (!setSearchQuery) {
        setSearchQuery = this.defaultSearchQuery;
      }
      if (!!setSearchQuery) {
        this.setSearchState({
          query: setSearchQuery,
        }, () => {
          this.searchByQuery().then(() => { });
        }, true, false, true);
      }
    }
  };

  stateToURL = (state) => {
    const encodedState = btoa(JSON.stringify(state));
    const URL = buildUrl(screens.EXPLORE_SEARCH, {
      search: encodedState,
    });
    return URL;
  };

  URLSearchToState = (search) => {
    if (search.indexOf('?search=') !== -1) {
      try {
        const encodedState = search.substr(8);
        return JSON.parse(atob(encodedState));
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  isURLStateOutdated = (searchQuery) => {
    const state = this.URLSearchToState(searchQuery);
    if (state === null) {
      return !(!!searchQuery && searchQuery.indexOf('?search=') !== -1);
    }

    for (let p in this.URLStateParams) {
      if (!deepEqual(getObjectValueByPath(state, this.URLStateParams[p]) ?? {},
        getObjectValueByPath(this.state.context, this.URLStateParams[p]) ?? {})) {
        return true;
      }
    }
    return false;
  };

  updateURL = (replace = false) => {
    if (!this.isURLStateOutdated(window.location.search)) {
      return;
    }

    const state = {
      chart: {
        settings: {
          persistent: this.state.context.chart.settings?.persistent,
        },
        focused: {
          circle: this.state.context.chart.focused?.circle,
        },
      },
      search: {
        query: this.state.context.search?.query,
        v: this.state.context.search?.v,
      },
      contextFilter: this.state.context.contextFilter
    };

    const URL = this.stateToURL(state);
    setItem(USER_LAST_EXPLORE_CONFIG, URL);
    if (window.location.pathname + window.location.search !== URL) {
      if (replace) {
        this.props.history.replace(URL);
        console.log(`Replace: URL(${URL})`);
      } else {
        this.props.history.push(URL);
        console.log(`Update: URL(${URL})`);
      }

      if (state.search?.query !== null) {
        setItem(USER_LAST_SEARCH_QUERY, state.search?.query);
      }

      // Analytics
      analytics.pageView('search');
    }
  };

  reRenderChart = () => {
    const key = randomStr(16);
    console.log(`Rerender: Panel(${key})`);
    this.setState(prevState => ({
      ...prevState,
      context: {
        ...prevState.context,
        key,
      },
    }));
  };

  setRunsState = (runsState, callback = null) => {
    this.setState(prevState => ({
      ...prevState,
      context: {
        ...prevState.context,
        runs: {
          ...prevState.context.runs,
          ...runsState,
        },
      },
    }), () => {
      if (callback !== null) {
        callback();
      }

      // FIXME
      this.groupRuns();
    });
  };

  setSearchState = (searchState, callback = null, updateURL = true, resetZoom = true, replaceURL = false) => {
    const searchQuery = searchState.query || prevState.context.searchInput?.value;

    let selectInput = '';
    let selectConditionInput = '';
    if (searchQuery) {
      const searchParts = searchQuery.split(' if ');
      if (searchParts.length === 2) {
        selectInput = searchParts[0];
        selectConditionInput = searchParts[1];
      } else if (searchParts.length === 1) {
        selectInput = searchParts[0];
        selectConditionInput = '';
      }
    }

    this.setState(prevState => ({
      ...prevState,
      context: {
        ...prevState.context,
        search: {
          ...prevState.context.search ?? {},
          ...searchState,
        },
        searchInput: {
          ...prevState.context.searchInput ?? {},
          value: searchQuery,
          selectInput,
          selectConditionInput,
        },
        ...resetZoom && {
          chart: {
            ...prevState.context.chart ?? {},
            settings: {
              ...prevState.context.chart?.settings ?? {},
              zoomMode: false,
              zoomHistory: [],
              persistent: {
                ...prevState.context.chart?.settings?.persistent ?? {},
                zoom: null
              }
            }
          }
        }
      },
    }), () => {
      if (callback !== null) {
        callback();
      }
      if (updateURL) {
        this.updateURL(replaceURL);
      }
    });
  };

  setSearchInputState = (searchInput) => {
    this.setState(prevState => {
      const searchInputState = Object.assign({}, prevState.context.searchInput, searchInput);
      const contextState = Object.assign({}, prevState.context, {
        searchInput: searchInputState,
      });
      return Object.assign({}, prevState, {
        context: contextState,
      });
    });
  };

  setChartState = (chartState, callback = null, updateURL) => {
    this.setState(prevState => {
      const chartStateUpd = Object.assign({}, prevState.context.chart, chartState);
      const contextState = Object.assign({}, prevState.context, {
        chart: chartStateUpd,
      });
      return Object.assign({}, prevState, {
        context: contextState,
      });
    }, () => {
      this.reRenderChart();
      if (callback !== null) {
        callback();
      }
      if (updateURL) {
        this.updateURL();
      }
    });
  };

  setChartSettingsState = (settingsState, callback = null, updateURL = true) => {
    this.setChartState({
      // FIXME: Not pass current state value
      settings: {
        ...this.state.context.chart?.settings ?? {},
        ...settingsState,
      },
    }, callback, updateURL);
  };

  setChartFocusedState = (focusedState, callback = null, updateURL = true) => {
    this.setChartState({
      // FIXME: Not pass current state value
      focused: {
        ...this.state.context.chart?.focused ?? {},
        ...focusedState,
      },
    }, callback, updateURL);
  };

  getRunsByQuery = (query) => {
    return new Promise((resolve, reject) => {
      this.setRunsState({ isLoading: true });
      this.props.getCommitsMetricsByQuery(query).then((data) => {
        this.setRunsState({
          isEmpty: !data.runs || data.runs.length === 0,
          data: data.runs,
          params: data.params,
          aggMetrics: data.agg_metrics,
          meta: data.meta,
        }, resolve);
      }).catch((err) => {
        // console.log(err, err.status);
        this.setRunsState({
          isEmpty: true,
          data: null,
          params: [],
          aggMetrics: {},
          meta: null,
        }, resolve);
      }).finally(() => {
        this.setRunsState({ isLoading: false });
      });
    });
  };

  getTFSummaryScalars = () => {
    return this.state.context.runs.data.filter(m => m.source !== undefined && m.source === 'tf_summary');
  };

  isAimRun = (run) => {
    return run['source'] === undefined;
  };

  isTFSummaryScalar = (run) => {
    return run['source'] === 'tf_summary';
  };

  enableExploreMetricsMode = () => {
    return this.state.context.runs?.meta?.params_selected !== true;
  };

  enableExploreParamsMode = () => {
    return this.state.context.runs?.meta?.params_selected === true;
  };

  getCountOfSelectedParams = (includeMetrics = true) => {
    const countOfParams = this.state.context?.runs?.params?.length;
    const countOfMetrics = Object.keys(this.state.context?.runs?.aggMetrics ?? {}).map(k => this.state.context.runs.aggMetrics[k].length);

    return includeMetrics ? countOfParams + countOfMetrics.reduce((a, b) => a + b, 0) : countOfParams;
  };

  getAllParamsPaths = () => {
    const paramPaths = {};

    this.state.context.traceList?.traces.forEach(trace => {
      trace.series.forEach(series => {
        Object.keys(series?.run.params).forEach(paramKey => {
          if (paramKey !== '__METRICS__') {
            if (!paramPaths.hasOwnProperty(paramKey)) {
              paramPaths[paramKey] = [];
            }
            Object.keys(series?.run.params[paramKey]).forEach(key => {
              if (!paramPaths[paramKey].includes(key)) {
                paramPaths[paramKey].push(key);
              }
            });
          }
        });
      });
    });

    return sortOnKeys(paramPaths);
  };

  getAllContextKeys = () => {
    const contextKeys = [];

    this.state.context.traceList?.traces.forEach(trace => {
      trace.series.forEach(series => {
        series.metric?.traces?.forEach(metricTrace => {
          if (!!metricTrace.context) {
            contextKeys.push(...Object.keys(metricTrace.context));
          }
        })
      });
    });

    return _.uniq(contextKeys).sort();
  };

  searchByQuery = (updateURL) => {
    return new Promise(resolve => {
      const query = this.state.context.search?.query.trim();
      this.setChartFocusedState({
        step: null,
        metric: {
          runHash: null,
          metricName: null,
          traceContext: null,
        },
        circle: {
          active: false,
          runHash: null,
          metricName: null,
          traceContext: null,
          step: null,
        },
      }, () => {
        Promise.all([
          this.getRunsByQuery(query),
          // Get other properties
        ]).then(() => {
          resolve();
        });
      }, updateURL);
    });
  };

  groupRuns = () => {
    if (!this.state.context.runs) {
      return;
    }

    const runs = this.state.context.runs.data;
    // FIXME
    if (runs === null) {
      return;
    }

    const grouping = {
      'color': this.state.context.contextFilter.groupByColor,
      'stroke': this.state.context.contextFilter.groupByStyle,
      'chart': this.state.context.contextFilter.groupByChart,
    };

    const traceList = new TraceList(grouping);

    runs.forEach((run) => {
      if (!run.metrics?.length) {
        traceList.addSeries(run, null, null);
      } else {
        run.metrics.forEach((metric) => {
          metric.traces.forEach((trace) => {
            traceList.addSeries(run, metric, trace);
          });
        });
      }
    });

    this.setState(prevState => ({
      ...prevState,
      context: {
        ...prevState.context,
        traceList,
      },
    }), () => {
      this.reRenderChart();
    });
  };

  updateGroupsProperties = () => {
  };

  getMetricByHash = (hash) => {
    for (let i in this.state.context.runs.data) {
      if (this.state.context.runs.data[i].hash === hash) {
        return this.state.context.runs.data[i];
      }
    }
    return null;
  };

  getMetricStepValueByStepIdx = (data, step) => {
    const item = this.getMetricStepDataByStepIdx(data, step);
    return item ? item[0] : null;
  };

  getMetricStepDataByStepIdx = (data, step) => {
    if (data === null || !data) {
      return null;
    }

    for (let i = 0; i < data.length; i++) {
      if (data[i][1] === step) {
        return data[i];
      } else if (data[i][1] > step) {
        return null;
      }
    }

    return null;
  };

  getTraceData = (runHash, metricName, context) => {
    let matchedRun = null, matchedMetric = null, matchedTrace = null, data = null;

    this.state.context.runs.data.forEach((run) => {
      if (matchedTrace !== null) return;
      run.metrics.forEach((metric) => {
        if (matchedTrace !== null) return;
        metric.traces.forEach((trace) => {
          if (matchedTrace !== null) return;
          if (run.run_hash === runHash && metric.name === metricName && this.contextToHash(trace.context) === context) {
            if (matchedTrace === null) {
              matchedRun = run;
              matchedMetric = metric;
              matchedTrace = trace;
              data = trace.data;
            }
          }
        });
      });
    });

    return {
      data,
      run: matchedRun,
      metric: matchedMetric,
      trace: matchedTrace,
    };
  };

  contextToHash = (context) => {
    // FIXME: Change encoding algorithm to base58
    return btoa(JSON.stringify(context)).replace(/[\=\+\/]/g, '');
  };

  traceToHash = (runHash, metricName, traceContext) => {
    if (typeof traceContext !== 'string') {
      traceContext = this.contextToHash(traceContext);
    }
    // FIXME: Change encoding algorithm to base58
    return btoa(`${runHash}/${metricName}/${traceContext}`).replace(/[\=\+\/]/g, '');
  };

  hashToColor = (hash, alpha = 1) => {
    const index = hash.split('').map((c, i) => hash.charCodeAt(i)).reduce((a, b) => a + b);
    const color = Color(COLORS[index % COLORS.length]).alpha(alpha);
    return color.toString();
  };

  getMetricColor = (run, metric, trace, alpha = 1) => {
    // TODO: Add conditional coloring
    const hash = this.traceToHash(run?.run_hash, metric?.name, trace?.context);
    return this.hashToColor(hash, alpha);
  };

  setContextFilter = (contextFilter, callback = this.groupRuns, updateURL = true, resetZoom = true) => {
    this.setState(prevState => {
      let stateUpdate = {
        ...prevState,
        context: {
          ...prevState.context,
          contextFilter: {
            ...prevState.context.contextFilter,
            ...contextFilter,
          },
        },
      };

      if (resetZoom && contextFilter.hasOwnProperty('groupByChart')) {
        stateUpdate.context.chart.settings.persistent.zoom = null;
        stateUpdate.context.chart.settings.zoomMode = false;
        stateUpdate.context.chart.settings.zoomHistory = [];
      }

      if (
        stateUpdate.context.contextFilter.aggregated &&
        stateUpdate.context.contextFilter.groupByColor.length === 0 &&
        stateUpdate.context.contextFilter.groupByStyle.length === 0 &&
        stateUpdate.context.contextFilter.groupByChart.length === 0
      ) {
        stateUpdate.context.contextFilter.aggregated = false;
      }

      if (contextFilter.hasOwnProperty('groupByColor')) {
        stateUpdate.context.chart.settings.persistent.indicator = false;
      }

      return stateUpdate;
    }, () => {
      if (callback !== null) {
        callback();
      }
      if (updateURL) {
        this.updateURL();
      }
    });
  };

  _renderBody = () => {
    const panelIndicesLen = this.state.context.traceList?.getChartsNumber();
    const panelIndices = [...Array(panelIndicesLen).keys()];
    const headerWidth = 70;
    const controlsWidth = 75;
    const searchBarHeight = 75;

    return (
      <div 
        className='HubMainScreen__grid__body'
        style={{
          height: `${this.state.height - searchBarHeight}px`,
        }}
      >
        <div
          className='HubMainScreen__grid__body__blocks'
        >
          <div
            className='HubMainScreen__grid__panel'
            style={{
              flex: this.state.panelFlex
            }}
          >
            <Panel
              parentHeight={this.state.height}
              parentWidth={this.state.width}
              indices={panelIndices}
              resizing={this.state.resizing}
            />
          </div>
          <div
            className='HubMainScreen__grid__resize__area'
            onMouseDown={this.startResize}
          >
            <div
              className={classNames({
                HubMainScreen__grid__resize__handler: true,
                active: this.state.resizing
              })}
            >
              <div className='HubMainScreen__grid__resize__icon' />
            </div>
          </div>
          <div
            className='HubMainScreen__grid__context'
            style={{
              flex: 1 - this.state.panelFlex
            }}
          >
            <ContextBox
              width={this.state.width - headerWidth - controlsWidth - 5}
              resizing={this.state.resizing}
            />
          </div>
        </div>
        <div className='HubMainScreen__grid__controls'>
          <ControlsSidebar />
        </div>
      </div>
    );
  };

  render() {
    return (
      <ProjectWrapper
        size='fluid'
        gap={false}
        ref={this.projectWrapperRef}
      >
        <Helmet>
          <meta title='' content='' />
        </Helmet>

        <HubMainScreenContext.Provider
          value={{
            // Pass state
            ...this.state.context,

            // Pass methods
            searchByQuery: this.searchByQuery,
            setChartSettingsState: this.setChartSettingsState,
            setChartFocusedState: this.setChartFocusedState,
            setSearchState: this.setSearchState,
            setSearchInputState: this.setSearchInputState,
            setRunsState: this.setRunsState,
            getMetricByHash: this.getMetricByHash,
            getTraceData: this.getTraceData,
            getMetricStepValueByStepIdx: this.getMetricStepValueByStepIdx,
            getMetricStepDataByStepIdx: this.getMetricStepDataByStepIdx,
            getTFSummaryScalars: this.getTFSummaryScalars,
            getMetricColor: this.getMetricColor,
            getAllParamsPaths: this.getAllParamsPaths,
            getAllContextKeys: this.getAllContextKeys,
            isAimRun: this.isAimRun,
            isTFSummaryScalar: this.isTFSummaryScalar,
            hashToColor: this.hashToColor,
            contextToHash: this.contextToHash,
            traceToHash: this.traceToHash,
            updateURL: this.updateURL,
            setContextFilter: this.setContextFilter,
            resetControls: this.resetControls,
            areControlsChanged: this.areControlsChanged,
            enableExploreMetricsMode: this.enableExploreMetricsMode,
            enableExploreParamsMode: this.enableExploreParamsMode,
            getCountOfSelectedParams: this.getCountOfSelectedParams,
          }}
        >
          <div
            className='HubMainScreen__wrapper'
            style={{
              height: this.state.height,
            }}
          >
            <div className='HubMainScreen'>
              <div className='HubMainScreen__grid'>
                <div className='HubMainScreen__grid__search-filter' ref={this.searchBarRef}>
                  <SelectForm />
                </div>
                {this._renderBody()}
              </div>
            </div>
          </div>
        </HubMainScreenContext.Provider>
      </ProjectWrapper>
    )
  }
}

export default withRouter(storeUtils.getWithState(
  classes.HUB_MAIN_SCREEN,
  HubMainScreen
));