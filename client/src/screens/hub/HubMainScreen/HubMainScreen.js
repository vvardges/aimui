import './HubMainScreen.less';

import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Helmet } from 'react-helmet';
import { withRouter } from 'react-router-dom';

import ProjectWrapper from '../../../wrappers/hub/ProjectWrapper/ProjectWrapper';
import * as classes from '../../../constants/classes';
import * as screens from '../../../constants/screens';
import * as storeUtils from '../../../storeUtils';
import { setItem, getItem } from '../../../services/storage';
import {
  USER_LAST_SEARCH_QUERY,
  AIM_QL_VERSION,
  EXPLORE_PANEL_FLEX_STYLE,
  EXPLORE_PANEL_VIEW_MODE,
  USER_LAST_EXPLORE_CONFIG,
} from '../../../config';
import Panel from './components/Panel/Panel';
import ContextBox from './components/ContextBox/ContextBox';
import ControlsSidebar from './components/ControlsSidebar/ControlsSidebar';
import {
  deepEqual,
  buildUrl,
  getObjectValueByPath,
  classNames,
} from '../../../utils';
import * as analytics from '../../../services/analytics';
import SelectForm from './components/SelectForm/SelectForm';
import { HubMainScreenModel } from './models/HubMainScreenModel';
import BarViewModes from '../../../components/hub/BarViewModes/BarViewModes';
import Alert from './components/Alert/Alert';
import UI from '../../../ui';

const URLStateParams = [
  'chart.focused.circle',
  'chart.settings.persistent',
  'search',
  'contextFilter',
];

const defaultSearchQuery = 'loss';
const searchBarHeight = 75;

function HubMainScreen(props) {
  let [state, setState] = useState({
    height: 0,
    width: 0,
    resizing: false,
    panelFlex: getItem(EXPLORE_PANEL_FLEX_STYLE),
    viewMode: getItem(EXPLORE_PANEL_VIEW_MODE) ?? 'resizable',
  });

  let { runs, traceList, search } = HubMainScreenModel.useHubMainScreenState([
    HubMainScreenModel.events.SET_RUNS_STATE,
    HubMainScreenModel.events.SET_TRACE_LIST,
  ]);

  const {
    setRunsState,
    setContextFilter,
    setSearchState,
    setChartFocusedState,
    setChartSettingsState,
  } = HubMainScreenModel.emitters;

  const projectWrapperRef = useRef();
  const searchBarRef = useRef();

  function updateWindowDimensions() {
    const wrapper = projectWrapperRef.current;
    const projectWrapperHeight = wrapper
      ? projectWrapperRef.current.getHeaderHeight()
      : null;
    if (projectWrapperHeight !== null) {
      setState((s) => ({
        ...s,
        height: window.innerHeight - projectWrapperHeight - 1,
        width: window.innerWidth,
      }));
    } else {
      setTimeout(updateWindowDimensions, 25);
    }
  }

  function startResize() {
    document.addEventListener('mouseup', endResize);
    document.addEventListener('mousemove', resizeHandler);
    document.body.style.cursor = 'row-resize';
    setState((s) => ({
      ...s,
      resizing: true,
    }));
  }

  function endResize() {
    document.removeEventListener('mouseup', endResize);
    document.removeEventListener('mousemove', resizeHandler);
    document.body.style.cursor = 'auto';
    setState((s) => ({
      ...s,
      resizing: false,
    }));
  }

  function resizeHandler(evt) {
    window.requestAnimationFrame(() => {
      const searchBarHeight = searchBarRef.current.clientHeight;
      const height =
        evt.clientY -
        projectWrapperRef.current.getHeaderHeight() -
        searchBarHeight;
      const flex = height / (state.height - searchBarHeight);
      setState((s) => ({
        ...s,
        panelFlex: flex,
      }));
    });
  }

  function stateToURL(state) {
    const encodedState = btoa(JSON.stringify(state));
    const URL = buildUrl(screens.EXPLORE_SEARCH, {
      search: encodedState,
    });
    return URL;
  }

  function URLSearchToState(search) {
    if (search.indexOf('?search=') !== -1) {
      try {
        const encodedState = search.substr(8);
        return JSON.parse(atob(encodedState));
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function isURLStateOutdated(searchQuery) {
    const state = URLSearchToState(searchQuery);
    if (state === null) {
      return !(!!searchQuery && searchQuery.indexOf('?search=') !== -1);
    }

    for (let p in URLStateParams) {
      if (
        !deepEqual(
          getObjectValueByPath(state, URLStateParams[p]) ?? {},
          getObjectValueByPath(
            HubMainScreenModel.getState(),
            URLStateParams[p],
          ) ?? {},
        )
      ) {
        return true;
      }
    }
    return false;
  }

  function recoverStateFromURL(search) {
    if (!!search && search.indexOf('?search=') !== -1) {
      if (!isURLStateOutdated(search)) {
        return;
      }

      const state = URLSearchToState(search);
      if (state.search.v !== AIM_QL_VERSION) {
        return;
      }

      setContextFilter(state.contextFilter, null, false);
      if (!deepEqual(state.search, HubMainScreenModel.getState().search)) {
        setSearchState(
          state.search,
          () => {
            searchByQuery(false).then(() => {
              setChartFocusedState(state.chart.focused, null);
              setChartSettingsState(state.chart.settings, null);
            });
          },
          false,
        );
      } else {
        setChartFocusedState(state.chart.focused, null);
        setChartSettingsState(state.chart.settings, null);
      }
    } else {
      let setSearchQuery = getItem(USER_LAST_SEARCH_QUERY);
      if (!setSearchQuery) {
        setSearchQuery = defaultSearchQuery;
      }
      if (!!setSearchQuery) {
        setSearchState(
          {
            query: setSearchQuery,
          },
          () => {
            searchByQuery().then(() => {});
          },
          false,
        );
      }
    }
  }

  function updateURL(replace = false) {
    if (!isURLStateOutdated(window.location.search)) {
      return;
    }

    const { chart, search, contextFilter } = HubMainScreenModel.getState();

    const state = {
      chart: {
        settings: {
          persistent: chart.settings?.persistent,
        },
        focused: {
          circle: chart.focused?.circle,
        },
      },
      search: {
        query: search?.query,
        v: search?.v,
      },
      contextFilter: contextFilter,
    };

    const URL = stateToURL(state);
    setItem(USER_LAST_EXPLORE_CONFIG, URL);
    if (window.location.pathname + window.location.search !== URL) {
      if (replace) {
        props.history.replace(URL);
        console.log(`Replace: URL(${URL})`);
      } else {
        props.history.push(URL);
        console.log(`Update: URL(${URL})`);
      }

      if (state.search?.query !== null) {
        setItem(USER_LAST_SEARCH_QUERY, state.search?.query);
      }

      // Analytics
      analytics.pageView('search');
    }
  }

  function searchByQuery() {
    return new Promise((resolve) => {
      const query = HubMainScreenModel.getState().search?.query?.trim();
      setChartFocusedState(
        {
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
        () => {
          Promise.all([
            getRunsByQuery(query),
            // Get other properties
          ]).then(() => {
            resolve();
          });
        },
      );
    });
  }

  function getRunsByQuery(query) {
    return new Promise((resolve, reject) => {
      setRunsState({ isLoading: true });
      props
        .getCommitsMetricsByQuery(query)
        .then((data) => {
          setRunsState(
            {
              isEmpty: !data.runs || data.runs.length === 0,
              data: data.runs,
              params: data.params,
              aggMetrics: data.agg_metrics,
              meta: data.meta,
            },
            resolve,
          );
        })
        .catch((err) => {
          // console.log(err, err.status);
          setRunsState(
            {
              isEmpty: true,
              data: null,
              params: [],
              aggMetrics: {},
              meta: null,
            },
            resolve,
          );
        })
        .finally(() => {
          setRunsState({ isLoading: false });
        });
    });
  }

  useEffect(() => {
    recoverStateFromURL(window.location.search);
  }, [props.location]);

  useEffect(() => {
    if (state.resizing === false) {
      setItem(EXPLORE_PANEL_FLEX_STYLE, state.panelFlex);
    }
  }, [state.resizing]);

  useEffect(() => {
    setItem(EXPLORE_PANEL_VIEW_MODE, state.viewMode);
  }, [state.viewMode]);

  useEffect(() => {
    props.completeProgress();
    updateWindowDimensions();
    window.addEventListener('resize', updateWindowDimensions);

    const subscription = HubMainScreenModel.subscribe(
      [
        HubMainScreenModel.events.SET_CHART_FOCUSED_STATE,
        HubMainScreenModel.events.SET_CHART_FOCUSED_ACTIVE_STATE,
        HubMainScreenModel.events.SET_CHART_SETTINGS_STATE,
        HubMainScreenModel.events.SET_CONTEXT_FILTER,
        HubMainScreenModel.events.SET_SEARCH_STATE,
      ],
      updateURL,
    );

    // Analytics
    analytics.pageView('search');

    return () => {
      subscription.unsubscribe();
      HubMainScreenModel.emit(null, {
        search: {
          ...HubMainScreenModel.getState().search,
          query: '',
        },
      });
      window.removeEventListener('resize', updateWindowDimensions);
      document.removeEventListener('mouseup', endResize);
      document.removeEventListener('mousemove', resizeHandler);
    };
  }, []);

  function _renderContent() {
    const panelIndicesLen = traceList?.getChartsNumber();
    const panelIndices = [...Array(panelIndicesLen).keys()];
    const headerWidth = 70;
    const controlsWidth = 75;

    return (
      <div
        className={classNames({
          HubMainScreen__grid__body: true,
          [`HubMainScreen__grid__body--${state.viewMode}`]: true,
        })}
        style={{
          height: `${state.height - searchBarHeight}px`,
        }}
      >
        <div className='HubMainScreen__grid__body__blocks'>
          {state.viewMode !== 'context' && (
            <div
              className='HubMainScreen__grid__panel'
              style={{
                flex: state.viewMode === 'panel' ? 1 : state.panelFlex,
              }}
            >
              <Panel
                parentHeight={state.height}
                parentWidth={state.width}
                mode={state.viewMode}
                indices={panelIndices}
                resizing={state.resizing}
              />
            </div>
          )}
          {state.viewMode === 'resizable' && (
            <div
              className='HubMainScreen__grid__resize__area'
              onMouseDown={startResize}
            >
              <div
                className={classNames({
                  HubMainScreen__grid__resize__handler: true,
                  active: state.resizing,
                })}
              >
                <div className='HubMainScreen__grid__resize__icon' />
              </div>
            </div>
          )}
          <div
            className={classNames({
              HubMainScreen__grid__context: true,
              'HubMainScreen__grid__context--minimize':
                state.viewMode === 'panel',
            })}
            style={{
              flex:
                state.viewMode === 'context'
                  ? 1
                  : state.viewMode === 'panel'
                    ? 0
                    : 1 - state.panelFlex,
            }}
          >
            {state.viewMode !== 'panel' ? (
              <ContextBox
                spacing={state.viewMode !== 'resizable'}
                width={state.width - headerWidth - controlsWidth - 5}
                resizing={state.resizing}
                viewMode={state.viewMode}
                setViewMode={(mode) =>
                  setState((s) => ({ ...s, viewMode: mode }))
                }
              />
            ) : (
              <div className='HubMainScreen__grid__context__bar'>
                <BarViewModes
                  viewMode={state.viewMode}
                  setViewMode={(mode) =>
                    setState((s) => ({ ...s, viewMode: mode }))
                  }
                />
              </div>
            )}
          </div>
        </div>
        <div className='HubMainScreen__grid__controls'>
          <ControlsSidebar />
        </div>
      </div>
    );
  }

  function _renderBody() {
    return runs.isLoading === false && runs.isEmpty === true ? (
      <div className='HubMainScreen__alerts'>
        <Alert>
          {!!search.query ? (
            <UI.Text type='grey' center>
              You haven't recorded experiments matching this query.
            </UI.Text>
          ) : (
            <UI.Text type='grey' center>
              It's super easy to search Aim experiments.
            </UI.Text>
          )}
          <UI.Text type='grey' center>
            Lookup{' '}
            <a
              className='link'
              href='https://github.com/aimhubio/aim#searching-experiments'
              target='_blank'
              rel='noopener noreferrer'
            >
              search docs
            </a>{' '}
            to learn more.
          </UI.Text>
        </Alert>
      </div>
    ) : (
      _renderContent()
    );
  }

  return (
    <ProjectWrapper size='fluid' gap={false} ref={projectWrapperRef}>
      <Helmet>
        <meta title='' content='' />
      </Helmet>
      <div
        className='HubMainScreen__wrapper'
        style={{
          height: state.height,
        }}
      >
        <div className='HubMainScreen'>
          <div className='HubMainScreen__grid'>
            <div
              className='HubMainScreen__grid__search-filter'
              ref={searchBarRef}
            >
              <SelectForm searchByQuery={searchByQuery} />
            </div>
            {_renderBody()}
          </div>
        </div>
      </div>
    </ProjectWrapper>
  );
}

export default withRouter(
  storeUtils.getWithState(classes.HUB_MAIN_SCREEN, HubMainScreen),
);
