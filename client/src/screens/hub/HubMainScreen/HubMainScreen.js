import './HubMainScreen.less';

import React from 'react';
import { Helmet } from 'react-helmet';
import { withRouter } from 'react-router-dom';

import ProjectWrapper from '../../../wrappers/hub/ProjectWrapper/ProjectWrapper';
import * as classes from '../../../constants/classes';
import * as screens from '../../../constants/screens';
import * as storeUtils from '../../../storeUtils';
import HubMainScreenContext from './HubMainScreenContext/HubMainScreenContext';
import Panel from './components/Panel/Panel';
import SearchBar from './components/SearchBar/SearchBar';
import ContextBox from './components/ContextBox/ContextBox';
import ControlsSidebar from './components/ControlsSidebar/ControlsSidebar';
import { randomStr, sortOnKeys, buildUrl } from '../../../utils';


class HubMainScreen extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      height: 0,
      width: 0,

      // Context state
      context: {
        // Chart config
        chart: {
          focused: {
            index: null,
            metric: {
              hash: null,
              index: null,
            },
            circle: {
              metricIndex: null,
              stepIndex: null,
            },
          },
          settings: {
            yScale: 0,
          },
        },

        // Chart data(metrics)
        metrics: {
          isLoading: false,
          isEmpty: true,
          data: [],
        },

        // Context data(params)
        params: {
          isLoading: false,
          isEmpty: true,
          unionNamespaces: [],
          unionFields: {},
          data: {},
        },

        // Search
        search: {
          query: undefined,
        },
        searchInput: {
          value: undefined,
        },

        // Unique key to re-render svg on chart or runs states update
        key: null,
      },
    };

    this.projectWrapperRef = React.createRef();
    this.panelRef = React.createRef();

    this.defaultSearchQuery = 'metric:loss';
  }

  componentWillMount() {
    this.props.resetProgress();
    this.unBindURLChangeListener = this.props.history.listen((location) => {
      this.recoverStateFromURL(location.search);
    });
  }

  componentDidUpdate() {
    if (!!this.panelRef.current && this.state.context.key !== this.panelRef.current.key) {
      this.panelRef.current.renderChart();
    }
  }

  componentDidMount() {
    this.props.completeProgress();
    this.updateWindowDimensions();
    window.addEventListener('resize', () => this.updateWindowDimensions());
    this.recoverStateFromURL(window.location.search);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', () => this.updateWindowDimensions());
    this.unBindURLChangeListener();
  }

  updateWindowDimensions = () => {
    const wrapper = this.projectWrapperRef.current;
    const projectWrapperHeight = wrapper ? this.projectWrapperRef.current.getHeaderHeight() : null;
    if (projectWrapperHeight) {
      this.setState({
        height: window.innerHeight - projectWrapperHeight - 1,
        width: window.innerWidth,
      });
    } else {
      setTimeout(() => this.updateWindowDimensions(), 25);
    }
  };

  recoverStateFromURL = (search) => {
    if (!!search && search.indexOf('?search=') !== -1) {
      const encodedState = window.location.search.substr(8);
      const state = JSON.parse(atob(encodedState));
      const query = state.search.query;

      if (this.state.context.search.query === undefined && state.search.query === undefined) {
        state.search.query = this.defaultSearchQuery;
      }

      if (JSON.stringify(state.search) !== JSON.stringify(this.state.context.search)) {
        this.setSearchState(state.search, () => {
          this.searchByQuery().then(() => {
            this.setChartFocusedState(state.chart.focused);
            this.setChartSettingsState(state.chart.settings);
          });
        });
      } else {
        this.setChartFocusedState(state.chart.focused);
        this.setChartSettingsState(state.chart.settings);
      }
    } else {
      this.setSearchState({
        query: this.defaultSearchQuery,
      }, () => {
        this.searchByQuery().then(() => {
        });
      });
    }
  };

  reRenderChart = () => {
    this.setState(prevState => ({
      ...prevState,
      context: {
        ...prevState.context,
        key: randomStr(16),
      },
    }));
  };

  updateURL = () => {
    const state = {
      chart: {
        settings: this.state.context.chart.settings,
        focused: {
          circle: this.state.context.chart.focused.circle,
          index: this.state.context.chart.focused.index,
        },
      },
      search: {
        query: this.state.context.search.query,
      },
    };

    const encodedState = btoa(JSON.stringify(state));
    const url = buildUrl(screens.MAIN_SEARCH, {
      search: encodedState,
    });
    if (window.location.pathname + window.location.search !== url) {
      this.props.history.push(url);
    }
  };

  setMetricsState = (metricsState, callback=null) => {
    this.setState(prevState => ({
      ...prevState,
      context: {
        ...prevState.context,
        metrics: {
          ...prevState.context.metrics,
          ...metricsState,
        },
      },
    }), () => {
      if (callback !== null) {
        callback();
      }
      this.reRenderChart();
    });
  };

  setParamsState = (paramsState, callback=null) => {
    this.setState(prevState => ({
      ...prevState,
      context: {
        ...prevState.context,
        params: {
          ...prevState.context.params,
          ...paramsState,
        },
      },
    }), () => {
      if (callback !== null) {
        callback();
      }
    });
  };

  setSearchState = (searchState, callback=null) => {
    this.setState(prevState => ({
      ...prevState,
      context: {
        ...prevState.context,
        search: {
          ...prevState.context.search,
          ...searchState,
        },
        searchInput: {
          ...prevState.context.searchInput,
          value: searchState.query || prevState.context.searchInput.value,
        },
      },
    }), () => {
      if (callback !== null) {
        callback();
      }
    });
  };

  setSearchInputValue = (value) => {
    this.setState(prevState => ({
      ...prevState,
      context: {
        ...prevState.context,
        searchInput: {
          ...prevState.context.searchInput,
          value,
        },
      },
    }));
  };

  setChartState = (chartState, callback=null) => {
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
    });
  };

  setChartSettingsState = (settingsState, callback=null) => {
    this.setChartState({
      // TOFIX: Not pass current state value
      settings: {
        ...this.state.context.chart.settings,
        ...settingsState,
      },
    }, callback);
  };

  setChartFocusedState = (focusedState, callback=null) => {
    this.setChartState({
      // TOFIX: Not pass current state value
      focused: {
        ...this.state.context.chart.focused,
        ...focusedState,
      },
    }, callback);
  };

  getMetricsByQuery = (query) => {
    return new Promise(resolve => {
      this.setMetricsState({ isLoading: true });
      this.props.getCommitsMetricsByQuery(query).then((data) => {
        this.setMetricsState({
          isEmpty: !data || Object.values(data).length === 0,
          data: data,
        }, resolve);
      }).finally(() => {
        this.setMetricsState({ isLoading: false });
      });
    });
  };

  getParamsByQuery = (query) => {
    return new Promise(resolve => {
      this.setParamsState({ isLoading: true });

      this.props.getCommitsDictionariesByQuery(query).then((data) => {
        let unionNamespaces = [];
        let unionFields = {};

        for (let i in data) {
          if (!!data[i].data && Object.keys(data[i].data).length) {
            unionNamespaces = unionNamespaces.concat(...Object.keys(data[i].data));
          }
        }
        unionNamespaces = Array.from(new Set(unionNamespaces));

        if (unionNamespaces.length) {
          for (let n in unionNamespaces) {
            unionFields[unionNamespaces[n]] = [];
          }
          for (let i in data) {
            Object.keys(data[i].data).forEach(n => {
              unionFields[n] = unionFields[n].concat(...Object.keys(data[i].data[n]));
            });
          }
          for (let n in unionNamespaces) {
            unionFields[unionNamespaces[n]] = Array.from(new Set(unionFields[unionNamespaces[n]])).sort();
          }
        }
        unionFields = sortOnKeys(unionFields);

        this.setParamsState({
          isEmpty: !unionNamespaces || unionNamespaces.length === 0,
          unionNamespaces,
          unionFields,
          data: data,
        }, resolve);
      }).finally(() => {
        this.setParamsState({ isLoading: false });
      });
    });
  };

  searchByQuery = () => {
    return new Promise(resolve => {
      const query = this.state.context.search.query.trim();
      this.setChartFocusedState({
        index: null,
        metric: {
          hash: null,
          index: null,
        },
        circle: {
          metricIndex: null,
          stepIndex: null,
        },
      }, () => {
        Promise.all([
          this.getMetricsByQuery(query),
          this.getParamsByQuery(query),
        ]).then(() => {
          this.updateURL();
          resolve();
        });
      });
    });
  };

  getMetricByHash = (hash) => {
    for (let i in this.state.context.metrics.data) {
      if (this.state.context.metrics.data[i].hash === hash) {
        return this.state.context.metrics.data[i];
      }
    }
    return null;
  };

  getMetricStepValueByStepIdx = (metricData, stepIdx) => {
    const item = this.getMetricStepDataByStepIdx(metricData, stepIdx);
    return item ? item.value : null;
  };

  getMetricStepDataByStepIdx = (metricData, stepIdx) => {
    for (let i = 0; i < metricData.length; i++) {
      if (metricData[i].step === stepIdx) {
        return metricData[i];
      } else if (metricData[i].step > stepIdx) {
        return null;
      }
    }

    return null;
  };

  hashToColor = (hash, alpha=1) => {
    const index = hash.split('').map((c, i) => hash.charCodeAt(i)).reduce((a, b) => a + b);
    const r = 50;
    const g = ( index * 27 ) % 255;
    const b = ( index * 13 ) % 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  getMetricColor = (metric, alpha=1) => {
    if (metric.tag && metric.tag.color) {
      return metric.tag.color;
    }

    return this.hashToColor(metric.hash, alpha);
  };

  _renderContent = () => {
    const headerWidth = 70;
    const controlsWidth = 80;

    return (
      <div
        className='HubMainScreen__wrapper'
        style={{
          height: this.state.height,
        }}
      >
        <div className='HubMainScreen'>
          <div className='HubMainScreen__grid'>
            <div className='HubMainScreen__grid__body'>
              <div className='HubMainScreen__grid__search'>
                <SearchBar />
              </div>
              <div className='HubMainScreen__grid__panel'>
                <Panel ref={this.panelRef} />
              </div>
              <div className='HubMainScreen__grid__context'>
                <ContextBox
                  width={this.state.width - headerWidth - controlsWidth}
                />
              </div>
            </div>
            <div className='HubMainScreen__grid__controls'>
              <ControlsSidebar />
            </div>
          </div>
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
            updateURL                   : this.updateURL,
            setChartSettingsState       : this.setChartSettingsState,
            setChartFocusedState        : this.setChartFocusedState,
            setSearchState              : this.setSearchState,
            setSearchInputValue         : this.setSearchInputValue,
            setMetricsState             : this.setMetricsState,
            searchByQuery               : this.searchByQuery,
            getMetricByHash             : this.getMetricByHash,
            getMetricStepValueByStepIdx : this.getMetricStepValueByStepIdx,
            getMetricStepDataByStepIdx  : this.getMetricStepDataByStepIdx,
            hashToColor                 : this.hashToColor,
            getMetricColor              : this.getMetricColor,
          }}
        >
          {this._renderContent()}
        </HubMainScreenContext.Provider>
      </ProjectWrapper>
    )
  }
}

export default withRouter(storeUtils.getWithState(
  classes.HUB_MAIN_SCREEN,
  HubMainScreen
));