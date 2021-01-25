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
  SET_CHART_POINTS_COUNT: 'SET_CHART_POINTS_COUNT',
  SET_CONTEXT_FILTER: 'SET_CONTEXT_FILTER',
  SET_SEARCH_STATE: 'SET_SEARCH_STATE',
  SET_SEARCH_INPUT_STATE: 'SET_SEARCH_INPUT_STATE',
  SET_SORT_FIELDS: 'SET_SORT_FIELDS',
  SET_SEED: 'SET_SEED',
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
        xAlignment: 'step',
        pointsCount: 50,
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
    seed: {
      color: 10,
      style: 10,
    },
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
        pointsCount: getState().chart.settings.persistent.pointsCount,
      },
    },
  },
  contextFilter: {
    groupByColor: [],
    groupByStyle: [],
    groupByChart: [],
    aggregated: false,
    seed: getState().contextFilter.seed,
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
        seed: getState().contextFilter.seed,
      },
    }),
  });

  if (!getState().runs.isLoading && !getState().runs.isEmpty) {
    setTraceList();
    const paramsPaths = getAllParamsPaths();
    let possibleSortFields = Object.keys(paramsPaths)
      .map((paramKey) => {
        return paramsPaths[paramKey].map((key) => `${paramKey}.${key}`);
      })
      .flat();
    if (isExploreParamsModeEnabled()) {
      const metrics = getAllMetrics();
      possibleSortFields = possibleSortFields.concat(
        Object.keys(metrics)
          .map((metricKey) => {
            return Object.keys(metrics[metricKey]).map(
              (key) => `${metricKey} ${key}`,
            );
          })
          .flat(),
      );
    }
    const sortFields = getState().sortFields.filter((field) => {
      return possibleSortFields.includes(field[0]);
    });
    setSortFields(sortFields);
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

  const seed = getState().contextFilter.seed;
  const grouping = {
    color: getState().contextFilter.groupByColor,
    stroke: getState().contextFilter.groupByStyle,
    chart: getState().contextFilter.groupByChart,
  };
  const xAlignment = getState().chart.settings.persistent.xAlignment;

  const traceList = new TraceList(grouping);
  const aggregate = traceList.groupingFields.length > 0;
  const sortFields = getState().sortFields;

  _.orderBy(
    runs,
    sortFields.map(
      (field) =>
        function (run) {
          if (field[0].includes('="') || field[0].includes('No context')) {
            const paramKey = '__METRICS__';
            for (let key in run.params?.[paramKey]) {
              for (let i = 0; i < run.params[paramKey][key].length; i++) {
                const value = run.params[paramKey][key][i].context
                  .map((metric) => `${metric[0]}="${metric[1]}"`)
                  .join(', ');
                const context = value === '' ? 'No context' : `${value}`;
                if (field[0] === `${key} ${context}`) {
                  return run.params[paramKey][key][i].values?.last ?? '';
                }
              }
            }
            return '';
          }
          return _.get(run, `params.${field[0]}`) ?? '';
        },
    ),
    sortFields.map((field) => field[1]),
  ).forEach((run) => {
    if (!run.metrics?.length) {
      traceList.addSeries(run, null, null, xAlignment, aggregate, seed);
    } else {
      run.metrics.forEach((metric) => {
        metric?.traces.forEach((trace) => {
          traceList.addSeries(run, metric, trace, xAlignment, aggregate, seed);
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

function setChartPointsCount(count) {
  emit(events.SET_CHART_POINTS_COUNT, {
    chart: {
      ...getState().chart,
      settings: {
        ...getState().chart.settings,
        persistent: {
          ...getState().chart.settings.persistent,
          pointsCount: +count,
        },
      },
    },
  });
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

function setChartFocusedActiveState(
  focusedState,
  callback = null,
  replaceUrl = false,
) {
  emit(events.SET_CHART_FOCUSED_ACTIVE_STATE, {
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

function setSeed(seed, type) {
  emit(events.SET_SEED, {
    contextFilter: {
      ...getState().contextFilter,
      seed: {
        ...getState().contextFilter.seed,
        [type]: seed,
      },
    },
  });

  setTraceList();
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
                typeof series?.run.params[paramKey][key] === 'object' &&
                series?.run.params[paramKey][key] !== null &&
                !Array.isArray(series?.run.params[paramKey][key])
              ) {
                if (
                  typeof paramPaths[paramKey][key] !== 'object' ||
                  paramPaths[paramKey][key] === null
                ) {
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

function getAllMetrics() {
  const metrics = {};
  const paramKey = '__METRICS__';
  getState().traceList?.traces.forEach((trace) => {
    trace.series.forEach((series) => {
      for (let key in series?.run.params?.[paramKey]) {
        if (!metrics.hasOwnProperty(key)) {
          metrics[key] = {};
        }
        for (let i = 0; i < series.run.params[paramKey][key].length; i++) {
          const value = series.run.params[paramKey][key][i].context
            .map((metric) => `${metric[0]}="${metric[1]}"`)
            .join(', ');
          const context = value === '' ? 'No context' : `${value}`;
          metrics[key][context] = true;
        }
      }
    });
  });

  return sortOnKeys(metrics);
}

function getAllContextKeys() {
  const contextKeys = [];

  getState().traceList?.traces.forEach((trace) => {
    trace.series.forEach((series) => {
      series.metric?.traces?.forEach((metricTrace) => {
        if (!!metricTrace?.context) {
          contextKeys.push(...Object.keys(metricTrace?.context ?? {}));
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
    data = null,
    axisValues = null;

  getState().traceList?.traces.forEach((traceModel) => {
    traceModel.series.forEach((series) => {
      const { run, metric, trace } = series;
      if (matchedTrace !== null) return;
      if (
        run.run_hash === runHash &&
        metric?.name === metricName &&
        contextToHash(trace?.context) === context
      ) {
        if (matchedTrace === null) {
          matchedRun = run;
          matchedMetric = metric;
          matchedTrace = trace;
          data = trace?.data ?? [];
          axisValues = trace?.axisValues ?? [];
        }
      }
    });
  });

  return {
    data,
    axisValues,
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

function getClosestStepData(step, data, axisValues) {
  let stepData;
  let closestStepIndex = null;
  let closestStep = null;

  if (step === null || step === undefined) {
    stepData = null;
  } else {
    let lastStepIndex = axisValues?.length - 1;
    if (data && step > axisValues?.[lastStepIndex]) {
      stepData = data?.[lastStepIndex] ?? null;
      closestStep = axisValues?.[lastStepIndex];
      closestStepIndex = lastStepIndex;
    } else {
      const index = axisValues?.indexOf(step);
      if (index > -1) {
        stepData = data?.[index] ?? null;
        closestStep = step;
        closestStepIndex = index;
      } else {
        closestStep = axisValues?.[0];
        closestStepIndex = 0;
        for (let i = 1; i < axisValues?.length; i++) {
          let current = axisValues[i];
          if (Math.abs(step - current) < Math.abs(step - closestStep)) {
            closestStep = current;
            closestStepIndex = i;
          }
        }

        stepData = data?.[closestStepIndex] ?? null;
      }
    }
  }
  return {
    stepData,
    closestStep,
    closestStepIndex,
  };
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
    setChartPointsCount,
    setChartFocusedState,
    setChartFocusedActiveState,
    setContextFilter,
    resetControls,
    setSearchState,
    setSearchInputState,
    setSortFields,
    setSeed,
  },
  helpers: {
    isExploreMetricsModeEnabled,
    isExploreParamsModeEnabled,
    getCountOfSelectedParams,
    getAllParamsPaths,
    getAllContextKeys,
    getAllMetrics,
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
    getClosestStepData,
  },
};
