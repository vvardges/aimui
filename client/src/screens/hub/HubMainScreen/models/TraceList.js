import Trace from './Trace';
import {
  deepEqual,
  getObjectValueByPath,
  arraysIntersection,
} from '../../../../utils';
import { COLORS } from '../../../../constants/colors';
import { STROKES } from '../../../../constants/strokes';
import _ from 'lodash';
import Series from './Series';

export default class TraceList {
  constructor(grouping = null) {
    this.traces = [];

    this.grouping = grouping;
    /*
      Example:
      {
        'color': ['params.hparams.learning_rate'],
        'stroke': ['params.hparams.batch_size'],
        'chart': ['params.hparams.learning_rate'],
      }
     */

    this.groupingFields = Object.values(this.grouping)
      .flat()
      .filter((v, i, self) => self.indexOf(v) === i);

    this.groupingConfigMap = {
      colors: [],
      strokes: [],
      charts: [],
    };
    /*
      Example:
      {
        colors: [
          {
            config: {
              'params.hparams.learning_rate': 0.01,
              'params.hparams.batch_size': 32,
            },
            value: '#AAA',
          }, {
            ...
          }
        ],
        strokes: [
          {
            config: {
              'params.hparams.learning_rate': 0.01,
              'params.hparams.batch_size': 32,
            },
            value: '2 2',
          }, {
            ...
          }
        ],
        charts: [
          {
            config: {
              'params.hparams.learning_rate': 0.01,
              'params.hparams.batch_size': 32,
            },
            value: 0,
          }, {
            ...
          }
        ],
      }
     */

    this.groups = {};
    /*
      Example:
      {
        'params.hparams.learning_rate': [
          {
            value: 0.01,
            group: {
              'params.hparams.batch_size': [
                {
                  value: 32,
                  group: {},
                }, {
                  value: 64,
                  group: {},
                },
              ],
            },
          }, {
            value: 0.001,
            group: {
              'params.hparams.batch_size': [
                {
                  value: 64,
                  group: {},
                }, {
                  value: 128,
                  group: {},
                },
              ],
            },
          },
        ],
      }
     */
  }

  addTrace = (trace) => {
    this.traces.push(trace);
  };

  getRunParam = (paramName, run, metric, trace) => {
    if (paramName === 'experiment') {
      return run.experiment_name;
    } else if (paramName === 'run.hash') {
      return run.run_hash;
    } else if (paramName === 'metric') {
      return metric !== null ? metric.name : undefined;
    } else if (paramName.startsWith('context.')) {
      const contextKey = paramName.substring(8);
      return trace !== null &&
        !!trace.context &&
        Object.keys(trace.context).indexOf(contextKey) !== -1
        ? trace.context[contextKey]
        : undefined;
    } else if (paramName.startsWith('params.')) {
      try {
        return getObjectValueByPath(run.params, paramName.substring(7));
      } catch (e) {
        return undefined;
      }
    } else {
      try {
        return getObjectValueByPath(run.params, paramName);
      } catch (e) {
        return undefined;
      }
    }
  };

  addSeries = (
    run,
    metric = null,
    trace = null,
    alignBy = 'step',
    aggregate = false,
    seed,
  ) => {
    let subGroup = this.groups;
    this.groupingFields.forEach((g) => {
      const groupVal = this.getRunParam(g, run, metric, trace);

      if (Object.keys(subGroup).indexOf(g) === -1) {
        subGroup[g] = [];
      }

      let valueExists = false;
      for (let i = 0; i < subGroup[g].length; i++) {
        if (subGroup[g][i].value === groupVal) {
          valueExists = true;
          subGroup = subGroup[g][i].group;
          break;
        }
      }

      if (!valueExists) {
        subGroup[g].push({
          value: groupVal,
          group: {},
        });
        subGroup = subGroup[g][subGroup[g].length - 1].group;
      }
    });

    const traceModelConfig = {};
    this.groupingFields.forEach((g) => {
      traceModelConfig[g] = this.getRunParam(g, run, metric, trace);
    });

    let traceModel = null;
    for (let t = 0; t < this.traces.length; t++) {
      if (this.traces[t].matchConfig(traceModelConfig)) {
        traceModel = this.traces[t];
      }
    }

    if (traceModel === null) {
      traceModel = new Trace(traceModelConfig);
      this.addTrace(traceModel);
    }

    // Apply coloring
    if ('color' in this.grouping) {
      let color = null;
      const modelColorConfigKeys = arraysIntersection(
        Object.keys(traceModelConfig),
        this.grouping.color,
      );
      const modelColorConfig = {};
      modelColorConfigKeys.forEach((k) => {
        modelColorConfig[k] = traceModelConfig[k];
      });
      this.groupingConfigMap.colors.forEach((colorGroup) => {
        if (color === null && deepEqual(colorGroup.config, modelColorConfig)) {
          color = colorGroup.value;
        }
      });
      if (color === null) {
        // Get new color

        // const groupsCount = this.groupingConfigMap.colors.map(
        //   (colorGroup) => colorGroup.value,
        // )?.length;

        const configEntries = Object.keys(modelColorConfig)
          .sort()
          .map((key) => [key, modelColorConfig[key]]);
        const configHash = btoa(JSON.stringify(configEntries)).replace(
          /[\=\+\/]/g,
          '',
        );
        const index = configHash
          .split('')
          .map((c, i) => configHash.charCodeAt(i))
          .reduce((a, b) => (a % seed.color) + b);

        color = COLORS[index % COLORS.length];
        this.groupingConfigMap.colors.push({
          config: modelColorConfig,
          value: color,
        });
      }
      traceModel.color = color;
    }

    // Apply stroke styling
    if ('stroke' in this.grouping) {
      let stroke = null;
      const modelStrokeConfigKeys = arraysIntersection(
        Object.keys(traceModelConfig),
        this.grouping.stroke,
      );
      const modelStrokeConfig = {};
      modelStrokeConfigKeys.forEach((k) => {
        modelStrokeConfig[k] = traceModelConfig[k];
      });
      this.groupingConfigMap.strokes.forEach((strGroup) => {
        if (stroke === null && deepEqual(strGroup.config, modelStrokeConfig)) {
          stroke = strGroup.value;
        }
      });
      if (stroke === null) {
        // Get new stroke style

        // const groupsCount = this.groupingConfigMap.strokes.map(
        //   (strGroup) => strGroup.value,
        // )?.length;

        const configEntries = Object.keys(modelStrokeConfig)
          .sort()
          .map((key) => [key, modelStrokeConfig[key]]);
        const configHash = btoa(JSON.stringify(configEntries)).replace(
          /[\=\+\/]/g,
          '',
        );
        const index = configHash
          .split('')
          .map((c, i) => configHash.charCodeAt(i))
          .reduce((a, b) => (a % seed.style) + b);

        stroke = STROKES[index % STROKES.length];
        this.groupingConfigMap.strokes.push({
          config: modelStrokeConfig,
          value: stroke,
        });
      }
      traceModel.stroke = stroke;
    }

    // Apply division to charts
    if ('chart' in this.grouping) {
      // FIXME: Remove code/logic duplication -> one function to handle color, stroke styling and chart division
      let chart = null;
      const modelChartConfigKeys = arraysIntersection(
        Object.keys(traceModelConfig),
        this.grouping.chart,
      );
      const modelChartConfig = {};
      modelChartConfigKeys.forEach((k) => {
        modelChartConfig[k] = traceModelConfig[k];
      });
      this.groupingConfigMap.charts.forEach((chartGroup) => {
        if (chart === null && deepEqual(chartGroup.config, modelChartConfig)) {
          chart = chartGroup.value;
        }
      });
      if (chart === null) {
        chart = this.groupingConfigMap.charts.length
          ? Math.max(
            ...this.groupingConfigMap.charts.map(
              (chartGroup) => chartGroup.value,
            ),
          ) + 1
          : 0;
        this.groupingConfigMap.charts.push({
          config: modelChartConfig,
          value: chart,
        });
      }
      traceModel.chart = chart;
    }

    // Add series to trace
    const seriesModel = new Series(run, metric, trace);

    let alignment = alignBy;

    if (alignBy === 'epoch' && this.grouping.chart.includes('context.subset')) {
      alignment = 'step';
    }
    traceModel.addSeries(seriesModel, aggregate, alignment);
    this.setAxisValues(alignBy, aggregate);
  };

  getChartsNumber = () => {
    return this.groupingConfigMap.charts.length;
  };

  setAxisValues = (alignBy, aggregate) => {
    switch (alignBy) {
      case 'step':
        this.traces.forEach((traceModel) => {
          traceModel.series.forEach((series) => {
            const { trace } = series;
            if (trace !== undefined && trace !== null) {
              trace.axisValues = [];
              trace.data.forEach((point) => {
                trace.axisValues.push(point[1]);
              });
            }
          });
        });
        break;
      case 'epoch':
        let epochSteps = {};
        this.traces.forEach((traceModel) => {
          traceModel.series.forEach((series) => {
            const { trace } = series;
            if (trace !== undefined && trace !== null) {
              trace.data.forEach((point) => {
                const epoch = point[2];
                if (!epochSteps.hasOwnProperty(epoch)) {
                  epochSteps[epoch] = [];
                }
              });
            }
          });
        });

        for (let epoch in epochSteps) {
          this.traces.forEach((traceModel) => {
            traceModel.series.forEach((series) => {
              const { trace } = series;
              if (trace !== undefined && trace !== null) {
                const stepsInEpoch = trace.data
                  .filter((point) => `${point[2]}` === epoch)
                  .map((point) => point[1]);
                if (stepsInEpoch.length > epochSteps[epoch].length) {
                  if (epoch !== 'null' && +epoch > 0) {
                    const prevEpoch = +epoch - 1;
                    if (
                      epochSteps.hasOwnProperty(prevEpoch) &&
                      epochSteps[prevEpoch][epochSteps[prevEpoch].length - 1] >
                        stepsInEpoch[0]
                    ) {
                      const prevEpochLastValue =
                        epochSteps[prevEpoch][epochSteps[prevEpoch].length - 1];
                      let steps = [];
                      let prevValue = prevEpochLastValue;
                      stepsInEpoch.forEach((step, i) => {
                        if (i === 0) {
                          prevValue =
                            prevValue +
                            (prevValue -
                              epochSteps[prevEpoch][
                                epochSteps[prevEpoch].length - 2
                              ]);
                        } else {
                          prevValue =
                            prevValue + (stepsInEpoch[i] - stepsInEpoch[i - 1]);
                        }
                        steps.push(prevValue);
                      });
                    } else {
                      epochSteps[epoch] = stepsInEpoch;
                    }
                  } else {
                    epochSteps[epoch] = stepsInEpoch;
                  }
                }
              }
            });
          });
        }

        this.epochSteps = epochSteps;

        this.traces.forEach((traceModel) => {
          traceModel.series.forEach((series) => {
            const { trace } = series;
            if (trace !== undefined && trace !== null) {
              trace.axisValues = [];
              for (let epoch in epochSteps) {
                const stepsInEpoch = trace.data
                  .filter((point) => `${point[2]}` === epoch)
                  .map((point) => point[1]);
                if (stepsInEpoch.length > 0) {
                  trace.axisValues =
                    epoch === 'null'
                      ? stepsInEpoch
                      : trace.axisValues.concat(
                        epochSteps[epoch].slice(
                          epochSteps[epoch].length - stepsInEpoch.length,
                        ),
                      );
                }
              }
            }
          });
        });
        // Apply alignemnt to aggregated data
        // TODO: improve overall aggregation logic (use it in single place)
        if (aggregate) {
          this.traces.forEach((traceModel) => {
            const valuesByStep = {};
            traceModel.series.forEach((series) => {
              const { trace } = series;
              if (trace !== undefined && trace !== null) {
                trace.data.forEach((point, index) => {
                  const step = trace.axisValues[index];
                  if (!valuesByStep.hasOwnProperty(step)) {
                    valuesByStep[step] = [];
                  }
                  let value = point[0];
                  valuesByStep[step].push(value);
                });
              }
            });
            if (!!traceModel.aggregation) {
              traceModel.aggregation.max.trace.data = Object.keys(
                valuesByStep,
              ).map((step) => [_.max(valuesByStep[step]), +step]);
              traceModel.aggregation.min.trace.data = Object.keys(
                valuesByStep,
              ).map((step) => [_.min(valuesByStep[step]), +step]);
              traceModel.aggregation.avg.trace.data = Object.keys(
                valuesByStep,
              ).map((step) => [
                _.sum(valuesByStep[step]) / valuesByStep[step].length,
                +step,
              ]);
            }
          });
        }
        break;
    }
  };
}
