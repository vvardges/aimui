import { useState, useEffect } from 'react';
import * as _ from 'lodash';

import {
  AIM_QL_VERSION,
  EXPLORE_METRIC_HIGHLIGHT_MODE,
  USER_LAST_EXPLORE_CONFIG,
  EXPLORE_PANEL_SORT_FIELDS,
} from '../../../../config';
import { getItem, removeItem, setItem } from '../../../../services/storage';
import { flattenObject, sortOnKeys } from '../../../../utils';
import Color from 'color';
import { COLORS } from '../../../../constants/colors';
import TraceList from './TraceList';

// Events

const events = {
  SET_RUNS_STATE: 'SET_RUNS_STATE',
  SET_TRACE_LIST: 'SET_TRACE_LIST',
  SET_CHART_FOCUSED_STATE: 'SET_CHART_FOCUSED_STATE',
  SET_CHART_FOCUSED_ACTIVE_STATE: 'SET_CHART_FOCUSED_ACTIVE_STATE',
  SET_CHART_SETTINGS_STATE: 'SET_CHART_SETTINGS_STATE',
  SET_CONTEXT_FILTER: 'SET_CONTEXT_FILTER',
  SET_SEARCH_STATE: 'SET_SEARCH_STATE',
  SET_SEARCH_INPUT_STATE: 'SET_SEARCH_INPUT_STATE',
  SET_SORT_FIELDS: 'SET_SORT_FIELDS',
};

// State

const state = {
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
      highlightMode: getItem(EXPLORE_METRIC_HIGHLIGHT_MODE) ?? 'run',
      persistent: {
        displayOutliers: false,
        zoom: null,
        interpolate: false,
        indicator: true,
      },
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

  // Grouping filter
  contextFilter: {
    groupByColor: [],
    groupByStyle: [],
    groupByChart: [],
    aggregated: false,
  },

  // Sort fields
  sortFields: JSON.parse(getItem(EXPLORE_PANEL_SORT_FIELDS)) ?? [],

  // Trace list
  traceList: null,
};

// initial controls

const initialControls = {
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
      },
    },
  },
  contextFilter: {
    groupByColor: [],
    groupByStyle: [],
    groupByChart: [],
    aggregated: false,
  },
};

// getter & setter

function getState() {
  return state;
}

function setState(stateUpdate) {
  Object.assign(state, stateUpdate);
}

// Event emitter

const subscriptions = {};

function subscribe(event, fn) {
  const multipleEvents = Array.isArray(event);
  if (multipleEvents) {
    event.forEach((evt) => {
      (subscriptions[evt] || (subscriptions[evt] = [])).push(fn);
    });
  } else {
    (subscriptions[event] || (subscriptions[event] = [])).push(fn);
  }

  return {
    unsubscribe: () => {
      if (multipleEvents) {
        event.forEach((evt) => {
          subscriptions[evt] &&
            subscriptions[evt].splice(subscriptions[evt].indexOf(fn) >>> 0, 1);
        });
      } else {
        subscriptions[event] &&
          subscriptions[event].splice(
            subscriptions[event].indexOf(fn) >>> 0,
            1,
          );
      }
    },
  };
}

function emit(event, data) {
  setState(_.omit(data, 'replaceUrl'));
  (subscriptions[event] || []).forEach((fn) => fn(data));
}

// event emitters

function setRunsState(runsState, callback = null) {
  const chartTypeChanged =
    runsState.hasOwnProperty('meta') &&
    runsState.data !== null &&
    getState().runs.data !== null &&
    runsState.meta?.params_selected !== getState().runs.meta?.params_selected;

  emit(events.SET_RUNS_STATE, {
    runs: {
      ...getState().runs,
      ...runsState,
    },
    ...(chartTypeChanged && {
      contextFilter: {
        groupByColor: [],
        groupByStyle: [],
        groupByChart: [],
        aggregated: false,
      },
    }),
  });

  if (!getState().runs.isLoading && !getState().runs.isEmpty) {
    setTraceList();
  }

  if (callback !== null) {
    callback();
  }
}

function setTraceList() {
  const runs = getState().runs?.data;
  if (!runs) {
    return;
  }

  const grouping = {
    color: getState().contextFilter.groupByColor,
    stroke: getState().contextFilter.groupByStyle,
    chart: getState().contextFilter.groupByChart,
  };

  const traceList = new TraceList(grouping);
  const aggregate = traceList.groupingFields.length > 0;
  const sortFields = getState().sortFields;

  _.orderBy(
    runs,
    sortFields.map((field) => field[0]),
    sortFields.map((field) => field[1]),
  ).forEach((run) => {
    if (!run.metrics?.length) {
      traceList.addSeries(run, null, null, aggregate);
    } else {
      run.metrics.forEach((metric) => {
        metric.traces.forEach((trace) => {
          traceList.addSeries(run, metric, trace, aggregate);
        });
      });
    }
  });

  emit(events.SET_TRACE_LIST, {
    traceList,
  });
}

function setChartSettingsState(
  settingsState,
  callback = null,
  replaceUrl = false,
) {
  emit(events.SET_CHART_SETTINGS_STATE, {
    chart: {
      ...getState().chart,
      settings: {
        ...getState().chart.settings,
        ...settingsState,
      },
    },
    replaceUrl,
  });
  if (callback !== null) {
    callback();
  }
}

function setChartFocusedState(
  focusedState,
  callback = null,
  replaceUrl = false,
) {
  emit(events.SET_CHART_FOCUSED_STATE, {
    chart: {
      ...getState().chart,
      focused: {
        ...getState().chart.focused,
        ...focusedState,
      },
    },
    replaceUrl,
  });
  if (callback !== null) {
    callback();
  }
}

function setChartFocusedActiveState(focusedState, callback = null) {
  emit(events.SET_CHART_FOCUSED_ACTIVE_STATE, {
    chart: {
      ...getState().chart,
      focused: {
        ...getState().chart.focused,
        ...focusedState,
      },
    },
  });
  if (callback !== null) {
    callback();
  }
}

function setContextFilter(
  contextFilterUpdate,
  callback = null,
  resetZoom,
  replaceUrl = false,
) {
  let stateUpdate = {
    contextFilter: {
      ...getState().contextFilter,
      ...contextFilterUpdate,
    },
  };

  if (replaceUrl) {
    stateUpdate.replaceUrl = true;
  }

  if (
    stateUpdate.contextFilter.aggregated &&
    stateUpdate.contextFilter.groupByColor.length === 0 &&
    stateUpdate.contextFilter.groupByStyle.length === 0 &&
    stateUpdate.contextFilter.groupByChart.length === 0
  ) {
    stateUpdate.contextFilter.aggregated = false;
  }

  if (resetZoom && contextFilterUpdate.hasOwnProperty('groupByChart')) {
    stateUpdate.chart = {
      ...getState().chart,
      settings: {
        ...getState().chart.settings,
        zoomMode: false,
        zoomHistory: [],
        persistent: {
          ...getState().chart.settings.persistent,
          zoom: null,
        },
      },
    };
  }

  if (contextFilterUpdate.hasOwnProperty('groupByColor')) {
    stateUpdate.chart = {
      ...getState().chart,
      settings: {
        ...getState().chart.settings,
        persistent: {
          ...getState().chart.settings.persistent,
          indicator: false,
        },
      },
    };
  }

  emit(events.SET_CONTEXT_FILTER, stateUpdate);

  setTraceList();

  if (callback !== null) {
    callback();
  }
}

function resetControls() {
  setContextFilter(initialControls.contextFilter);
  setChartSettingsState(initialControls.chart.settings);
  removeItem(USER_LAST_EXPLORE_CONFIG);
}

function setSearchState(
  searchState,
  callback = null,
  resetZoom = true,
  replaceUrl = false,
) {
  const searchQuery = searchState.query || getState().searchInput?.value;

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

  emit(events.SET_SEARCH_STATE, {
    search: {
      ...getState().search,
      ...searchState,
    },
    searchInput: {
      ...getState().searchInput,
      value: searchQuery,
      selectInput,
      selectConditionInput,
    },
    ...(resetZoom && {
      chart: {
        ...getState().chart,
        settings: {
          ...getState().chart?.settings,
          zoomMode: false,
          zoomHistory: [],
          persistent: {
            ...getState().chart?.settings?.persistent,
            zoom: null,
          },
        },
      },
    }),
    replaceUrl,
  });
  if (callback !== null) {
    callback();
  }
}

function setSearchInputState(searchInput, callback = null) {
  emit(events.SET_SEARCH_INPUT_STATE, {
    searchInput: {
      ...getState().searchInput,
      ...searchInput,
    },
  });
  if (callback !== null) {
    callback();
  }
}

function setSortFields(sortFields) {
  emit(events.SET_SORT_FIELDS, {
    sortFields,
  });

  setTraceList();

  setItem(EXPLORE_PANEL_SORT_FIELDS, JSON.stringify(sortFields));
}

// helpers

function isExploreMetricsModeEnabled() {
  return getState().runs?.meta?.params_selected !== true;
}

function isExploreParamsModeEnabled() {
  return getState().runs?.meta?.params_selected === true;
}

function getCountOfSelectedParams(includeMetrics = true) {
  const countOfParams = getState().runs?.params?.length;
  const countOfMetrics = Object.keys(getState().runs?.aggMetrics ?? {}).map(
    (k) => getState().runs.aggMetrics[k].length,
  );

  return includeMetrics
    ? countOfParams + countOfMetrics.reduce((a, b) => a + b, 0)
    : countOfParams;
}

function getAllParamsPaths(deep = true, nested = false) {
  const paramPaths = {};

  getState().traceList?.traces.forEach((trace) => {
    trace.series.forEach((series) => {
      Object.keys(series?.run.params).forEach((paramKey) => {
        if (paramKey === '__METRICS__') {
          return;
        }

        if (!paramPaths.hasOwnProperty(paramKey)) {
          if (deep && nested) {
            paramPaths[paramKey] = {};
          } else {
            paramPaths[paramKey] = [];
          }
        }

        if (deep) {
          if (nested) {
            for (let key in series?.run.params[paramKey]) {
              if (
                typeof paramPaths[paramKey][key] === 'object' ||
                typeof series?.run.params[paramKey][key] === 'object'
              ) {
                if (!paramPaths.hasOwnProperty(paramKey)) {
                  paramPaths[paramKey][key] = {};
                }
                paramPaths[paramKey][key] = _.merge(
                  paramPaths[paramKey][key],
                  series?.run.params[paramKey][key],
                );
              } else {
                paramPaths[paramKey][key] = series?.run.params[paramKey][key];
              }
            }
          } else {
            paramPaths[paramKey].push(
              ...Object.keys(flattenObject(series?.run.params[paramKey])),
            );
            paramPaths[paramKey] = _.uniq(paramPaths[paramKey]).sort();
          }
        } else {
          Object.keys(series?.run.params[paramKey]).forEach((key) => {
            if (!paramPaths[paramKey].includes(key)) {
              paramPaths[paramKey].push(key);
              paramPaths[paramKey].sort();
            }
          });
        }
      });
    });
  });

  return sortOnKeys(paramPaths);
}

function getAllContextKeys() {
  const contextKeys = [];

  getState().traceList?.traces.forEach((trace) => {
    trace.series.forEach((series) => {
      series.metric?.traces?.forEach((metricTrace) => {
        if (!!metricTrace.context) {
          contextKeys.push(...Object.keys(metricTrace.context));
        }
      });
    });
  });

  return _.uniq(contextKeys).sort();
}

function areControlsChanged() {
  return !_.isEqual(
    {
      chart: {
        settings: getState().chart.settings,
      },
      contextFilter: getState().contextFilter,
    },
    initialControls,
  );
}

function getTFSummaryScalars() {
  return getState().runs.data.filter(
    (m) => m.source !== undefined && m.source === 'tf_summary',
  );
}

function isAimRun(run) {
  return run['source'] === undefined;
}

function isTFSummaryScalar(run) {
  return run['source'] === 'tf_summary';
}

function getMetricByHash(hash) {
  for (let i in getState().runs.data) {
    if (getState().runs.data[i].hash === hash) {
      return getState().runs.data[i];
    }
  }
  return null;
}

function getMetricStepValueByStepIdx(data, step) {
  const item = getMetricStepDataByStepIdx(data, step);
  return item ? item[0] : null;
}

function getMetricStepDataByStepIdx(data, step) {
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
}

function getTraceData(runHash, metricName, context) {
  let matchedRun = null,
    matchedMetric = null,
    matchedTrace = null,
    data = null;

  getState().runs.data.forEach((run) => {
    if (matchedTrace !== null) return;
    run.metrics.forEach((metric) => {
      if (matchedTrace !== null) return;
      metric.traces.forEach((trace) => {
        if (matchedTrace !== null) return;
        if (
          run.run_hash === runHash &&
          metric.name === metricName &&
          contextToHash(trace.context) === context
        ) {
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
}

function contextToHash(context) {
  // FIXME: Change encoding algorithm to base58
  return btoa(JSON.stringify(context)).replace(/[\=\+\/]/g, '');
}

function traceToHash(runHash, metricName, traceContext) {
  if (typeof traceContext !== 'string') {
    traceContext = contextToHash(traceContext);
  }
  // FIXME: Change encoding algorithm to base58
  return btoa(`${runHash}/${metricName}/${traceContext}`).replace(
    /[\=\+\/]/g,
    '',
  );
}

function hashToColor(hash, alpha = 1) {
  const index = hash
    .split('')
    .map((c, i) => hash.charCodeAt(i))
    .reduce((a, b) => a + b);
  const color = Color(COLORS[index % COLORS.length]).alpha(alpha);
  return color.toString();
}

function getMetricColor(run, metric, trace, alpha = 1) {
  // TODO: Add conditional coloring
  const hash = traceToHash(run?.run_hash, metric?.name, trace?.context);
  return hashToColor(hash, alpha);
}

// custom hook

function useHubMainScreenState(events) {
  const [componentState, setComponentState] = useState(getState());

  useEffect(() => {
    const subscription = subscribe(events, () => {
      setComponentState({
        ...getState(),
      });
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return componentState;
}

export const HubMainScreenModel = {
  events,
  getState,
  subscribe,
  emit,
  useHubMainScreenState,
  emitters: {
    setRunsState,
    setTraceList,
    setChartSettingsState,
    setChartFocusedState,
    setChartFocusedActiveState,
    setContextFilter,
    resetControls,
    setSearchState,
    setSearchInputState,
    setSortFields,
  },
  helpers: {
    isExploreMetricsModeEnabled,
    isExploreParamsModeEnabled,
    getCountOfSelectedParams,
    getAllParamsPaths,
    getAllContextKeys,
    areControlsChanged,
    getTFSummaryScalars,
    isAimRun,
    isTFSummaryScalar,
    getMetricByHash,
    getMetricStepValueByStepIdx,
    getMetricStepDataByStepIdx,
    getTraceData,
    contextToHash,
    traceToHash,
    hashToColor,
    getMetricColor,
  },
};
