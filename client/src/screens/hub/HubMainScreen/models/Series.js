export default class Series {
  constructor(run, metric, trace) {
    this.run = run;
    this.metric = metric;
    this.trace = trace;
  }

  get params() {
    return this.run.params;
  }

  get experimentName() {
    return this.run.experiment_name;
  }

  get runHash() {
    return this.run.run_hash;
  }

  get metricInfo() {
    return this.metric;
  }

  get traceInfo() {
    return this.trace;
  }

  getPoint = (index) => {
    if (index >= 0 && !!this.trace.data && this.trace.data.length > index) {
      return this.trace.data[index];
    }
    return null;
  };

  getValue = (index) => {
    const point = this.getPoint(index);
    return point !== null ? point[0] : null;
  };
}
