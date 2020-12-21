import './HubMainScreen.less';

import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { withRouter } from 'react-router-dom';
import * as _ from 'lodash';

import ProjectWrapper from '../../../wrappers/hub/ProjectWrapper/ProjectWrapper';
import * as classes from '../../../constants/classes';
import * as screens from '../../../constants/screens';
import * as storeUtils from '../../../storeUtils';
import { setItem, getItem } from '../../../services/storage';
import {
  USER_LAST_SEARCH_QUERY,
  AIM_QL_VERSION,
  EXPLORE_PANEL_FLEX_STYLE,
  USER_LAST_EXPLORE_CONFIG,
} from '../../../config';
import Panel from './components/Panel/Panel';
import SearchBar from '../../../components/hub/SearchBar/SearchBar';
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

const URLStateParams = [
  'chart.focused.circle',
  'chart.settings.persistent',
  'search',
  'contextFilter',
];

const defaultSearchQuery = 'loss';
function HubMainScreen(props) {
  let [state, setState] = useState({
    height: 0,
    width: 0,
    resizing: false,
    panelFlex: getItem(EXPLORE_PANEL_FLEX_STYLE),
  });
  let { traceList } = HubMainScreenModel.useHubMainScreenState(
    HubMainScreenModel.events.SET_TRACE_LIST,
  );

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
    props.completeProgress();
    updateWindowDimensions();
    window.addEventListener('resize', updateWindowDimensions);

    const subscription = HubMainScreenModel.subscribe(
      [
        HubMainScreenModel.events.SET_CHART_FOCUSED_STATE,
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
      window.removeEventListener('resize', updateWindowDimensions);
      document.removeEventListener('mouseup', endResize);
      document.removeEventListener('mousemove', resizeHandler);
    };
  }, []);

  function _renderBody() {
    const panelIndicesLen = traceList?.getChartsNumber();
    const panelIndices = [...Array(panelIndicesLen).keys()];
    const headerWidth = 70;
    const controlsWidth = 75;
    const searchBarHeight = 75;

    return (
      <div
        className='HubMainScreen__grid__body'
        style={{
          height: `${state.height - searchBarHeight}px`,
        }}
      >
        <div className='HubMainScreen__grid__body__blocks'>
          <div
            className='HubMainScreen__grid__panel'
            style={{
              flex: state.panelFlex,
            }}
          >
            <Panel
              parentHeight={state.height}
              parentWidth={state.width}
              indices={panelIndices}
              resizing={state.resizing}
            />
          </div>
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
          <div
            className='HubMainScreen__grid__context'
            style={{
              flex: 1 - state.panelFlex,
            }}
          >
            <ContextBox
              width={state.width - headerWidth - controlsWidth - 5}
              resizing={state.resizing}
            />
          </div>
        </div>
        <div className='HubMainScreen__grid__controls'>
          <ControlsSidebar />
        </div>
      </div>
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
