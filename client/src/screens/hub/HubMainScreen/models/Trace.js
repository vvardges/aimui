import { deepEqual, formatValue } from '../../../../utils';
import Series from './Series';
import _ from 'lodash';

export default class Trace {
  constructor(config) {
    this.series = [];
    this.aggregation = {
      active: false,
      min: null,
      max: null,
      avg: null,
    };
    this.config = config;
    this.color = null;
    this.stroke = null;
    this.chart = null;
    this.experiments = [];
    this.metrics = [];
    this.contexts = [];
  }

  get seriesLength() {
    return this.series.length;
  };

  clone = () => {
    const traceClone = new Trace(this.config);

    traceClone.color = this.color;
    traceClone.stroke = this.stroke;
    traceClone.chart = this.chart;

    traceClone.series = this.series.slice();
    traceClone.aggregate();

    return traceClone;
  };

  addSeries = (series) => {
    this.series.push(series);
    
    this.setExperiments(series.run.experiment_name);
    if (series.metric !== null) this.setMetrics(series.metric.name);
    if (series.trace !== null) this.setContexts(series.trace.context);

    // TODO: Implement 'lazy' aggregation
    this.aggregate();
  };

  removeSeries = (index) => {
    this.series.splice(index,1);
    this.aggregate();
  };

  aggregate = () => {
    this.aggregation.min = this.aggregateSeries(values => _.min(values));
    this.aggregation.max = this.aggregateSeries(values => _.max(values));
    this.aggregation.avg = this.aggregateSeries(values => _.sum(values) / values.length);
  };

  aggregateSeries = (aggFunc) => {
    const trace = {
      data: [],
      num_steps: 0,
      context: null,
    };
    const metric = {
      name: null,
      traces: [trace],
    };
    const run = {
      experiment_name: null,
      run_hash: null,
      params: null,
      metrics: [metric],
    };

    // Aggregate params and configs
    const name = [];
    const experiment_name = [];
    const run_hash = [];
    const context = {};
    const params = {};
    this.series.forEach(s => {
      experiment_name.push(s.run.experiment_name);
      run_hash.push(s.run.run_hash);
      if (s.metric !== null) name.push(s.metric.name);
      // FIXME: Use deepmerge to merge arrays as well
      if (!!s.run.params) {
        _.merge(params, s.run.params);
      }
      if (!!s.trace?.context) {
        _.merge(context, s.trace.context);
      }
    });
    run.params = params;
    trace.context = context;
    metric.name = _.uniq(name);
    run.run_hash = _.uniq(run_hash);
    run.experiment_name = _.uniq(experiment_name);

    // Aggregate data
    let idx = 0;
    while (true) {
      const values = [];
      let step = null;
      let timestamp = null;
      this.series.forEach(s => {
        if (s.trace !== null) {
          const point = s.getPoint(idx);
          if (point !== null) {
            values.push(point[0]);
            // TODO: Aggregate step(?) and relative time(!)
            step = point[1];
            timestamp = point[3];
          }
        }
      });
      if (values.length > 0) {
        trace.data.push([aggFunc(values), step, null, timestamp]);
      } else {
        break;
      }
      idx += 1;
    }

    if (trace.data.length) {
      trace.num_steps = trace.data[trace.data.length-1][1];
    }

    return new Series(run, metric, trace);
  };

  matchConfig = (config) => {
    return deepEqual(config, this.config);
  };

  hasRun = (run_hash, metricName, traceContext) => {
    for (let i = 0; i < this.series.length; i++) {
      let series = this.series[i];
      if (
        series?.run?.run_hash === run_hash &&
        series.metric?.name === metricName &&
        btoa(JSON.stringify(series.trace.context)).replace(/[\=\+\/]/g, '') === traceContext
      ) {
        return true;
      }
    }

    return false;
  };

  setExperiments = (experiment_name) => {
    if (!this.experiments.includes(experiment_name)) {
      this.experiments.push(experiment_name);
    }
  };

  setMetrics = (metric_name) => {
    if (!this.metrics.includes(metric_name)) {
      this.metrics.push(metric_name);
    }
  };

  setContexts = (context) => {
    if (!!context) {
      Object.keys(context).forEach(contextKey => {
        let contextValue = `${contextKey}=${formatValue(context[contextKey])}`;
        if (!this.contexts.includes(contextValue)) {
          this.contexts.push(contextValue);
        }
      });
    }
  };

  getAggregatedMetricMinMax = (metric, context) => {
    let result = {
      min: undefined,
      avg: undefined,
      max: undefined,
    };
    let lastValuesSum;
    this.series.forEach(series => {
      let seriesMetricValue = series.getAggregatedMetricValue(metric, context);
      if (result.min === undefined || seriesMetricValue < result.min) {
        result.min = seriesMetricValue;
      }
      if (result.max === undefined || seriesMetricValue > result.max) {
        result.max = seriesMetricValue;
      }
      if (seriesMetricValue !== undefined && seriesMetricValue !== null) {
        if (lastValuesSum === undefined) {
          lastValuesSum = seriesMetricValue;
        } else {
          lastValuesSum += seriesMetricValue;
        }
      }
    });
    result.avg = lastValuesSum === undefined ? undefined : lastValuesSum / this.series.length;
    return result;
  };
}
