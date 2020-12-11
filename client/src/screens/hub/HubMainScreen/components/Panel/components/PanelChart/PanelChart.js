import './PanelChart.less';

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Color from 'color';

import * as classes from '../../../../../../../constants/classes';
import * as storeUtils from '../../../../../../../storeUtils';
import {
  classNames,
  buildUrl,
  removeOutliers,
  formatValue,
} from '../../../../../../../utils';
import {
  HUB_PROJECT_EXPERIMENT,
  HUB_PROJECT_EXECUTABLE_PROCESS_DETAIL,
  HUB_PROJECT_CREATE_TAG,
} from '../../../../../../../constants/screens';
import UI from '../../../../../../../ui';
import PopUp from '../PopUp/PopUp';
import HubMainScreenContext from '../../../../HubMainScreenContext/HubMainScreenContext';

const d3 = require('d3');

const popUpDefaultWidth = 250;
const popUpDefaultHeight = 200;
const circleRadius = 4;
const circleActiveRadius = 7;

class PanelChart extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // Chart
      visBox: {
        margin: {
          top: 20,
          right: 20,
          bottom: 30,
          left: 60,
        },
        height: null,
        width: null,
      },
      plotBox: {
        height: null,
        width: null,
      },
      chart: {
        xNum: 0,
        xMax: 0,
        xSteps: [],
        xScale: null,
        yScale: null,
      },
      key: null,

      // PopUps
      chartPopUp: {
        display: false,
        left: 0,
        top: 0,
        width: popUpDefaultWidth,
        height: popUpDefaultHeight,
        selectedTags: [],
        selectedTagsLoading: false,
        run: null,
        metric: null,
        trace: null,
        point: null,
      },
      tagPopUp: {
        display: false,
        isLoading: false,
        left: 0,
        top: 0,
        tags: [],
      },
      commitPopUp: {
        display: false,
        isLoading: false,
        left: 0,
        top: 0,
        data: null,
        processKillBtn: {
          loading: false,
          disabled: false,
        },
      },
    };

    this.parentRef = React.createRef();
    this.visRef = React.createRef();
    this.svg = null;
    this.plot = null;
    this.bgRect = null;
    this.hoverLine = null;
    this.axes = null;
    this.lines = null;
    this.attributes = null;
    this.brush = null;

    this.idleTimeout = null;

    this.curves = [
      'curveLinear',
      'curveBasis',
      'curveBundle',
      'curveCardinal',
      'curveCatmullRom',
      'curveMonotoneX',
      'curveMonotoneY',
      'curveNatural',
      'curveStep',
      'curveStepAfter',
      'curveStepBefore',
      'curveBasisClosed',
    ];

    this.scale = ['scaleLinear', 'scaleLog'];
  }

  componentDidMount() {
    this.initD3();
    this.renderChart();
    // setTimeout(this.renderChart, 500);
    window.addEventListener('resize', () => this.resize());
  }

  componentWillUnmount() {
    window.removeEventListener('resize', () => this.resize());
  }

  resize = () => {
    this.renderChart();
  };

  initD3 = () => {
    d3.selection.prototype.moveToFront = function () {
      return this.each(function () {
        this.parentNode.appendChild(this);
      });
    };
  };

  renderChart = () => {
    this.clear();

    if (this.context.runs.isLoading || this.context.runs.isEmpty) {
      return;
    }

    this.draw();
  };

  clear = () => {
    if (!this.visRef.current) {
      return;
    }

    const visArea = d3.select(this.visRef.current);
    visArea.selectAll('*').remove();
    visArea.attr('style', null);
    this._linesAreDrawn = false;
  };

  draw = () => {
    if (!this.visRef.current) {
      return;
    }

    this.drawArea(() =>
      this.drawAxes(() => {
        if (!this._linesAreDrawn) {
          window.requestAnimationFrame(() => {
            if (!this._linesAreDrawn) {
              this._linesAreDrawn = true;
              if (this.context.contextFilter.aggregated) {
                this.drawAggregatedLines();
              } else {
                this.drawLines();
              }
              this.drawHoverAttributes();
              this.bindInteractions();
            }
          });
        }
      }),
    );
  };

  drawArea = (cb) => {
    const parent = d3.select(this.parentRef.current);
    const visArea = d3.select(this.visRef.current);
    const parentRect = parent.node().getBoundingClientRect();
    const parentWidth = parentRect.width;
    const parentHeight = parentRect.height;

    const { margin } = this.state.visBox;
    const width = this.props.width ? this.props.width : parentWidth;
    const height = this.props.height ? this.props.height : parentHeight;

    this.setState(
      {
        ...this.state,
        visBox: {
          ...this.state.visBox,
          width,
          height,
        },
        plotBox: {
          ...this.state.plotBox,
          width: width - margin.left - margin.right,
          height: height - margin.top - margin.bottom,
        },
      },
      () => {
        visArea
          .style('width', `${this.state.visBox.width}px`)
          .style('height', `${this.state.visBox.height}px`);

        this.svg = visArea
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .attr('xmlns', 'http://www.w3.org/2000/svg'); // .attr('id', 'panel_svg');

        if (this.context.traceList?.grouping.chart) {
          this.svg
            .append('text')
            .attr('x', width / 2)
            .attr('y', margin.top)
            .attr('text-anchor', 'middle')
            .style('font-size', '0.7em')
            .text(
              this.context.traceList?.grouping.chart.length > 0
                ? `#${
                    this.props.index + 1
                  } ${this.context.traceList?.grouping.chart
                    .map((key) => {
                      return (
                        key +
                        '=' +
                        formatValue(
                          this.context.traceList.traces.find(
                            (elem) => elem.chart === this.props.index,
                          )?.config[key],
                          false,
                        )
                      );
                    })
                    .join(', ')}`
                : '',
            )
            .append('svg:title')
            .text(
              this.context.traceList?.grouping.chart.length > 0
                ? `#${
                    this.props.index + 1
                  } ${this.context.traceList?.grouping.chart
                    .map((key) => {
                      return (
                        key +
                        '=' +
                        formatValue(
                          this.context.traceList.traces.find(
                            (elem) => elem.chart === this.props.index,
                          )?.config[key],
                          false,
                        )
                      );
                    })
                    .join(', ')}`
                : '',
            );
        }

        this.bgRect = this.svg
          .append('rect')
          .attr('x', margin.left)
          .attr('y', margin.top)
          .attr('width', width - margin.left - margin.right)
          .attr('height', height - margin.top - margin.bottom)
          .style('fill', 'transparent');

        this.plot = this.svg
          .append('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);

        this.axes = this.plot.append('g').attr('class', 'Axes');

        this.lines = this.plot.append('g').attr('class', 'Lines');
        this.lines
          .append('clipPath')
          .attr('id', 'lines-rect-clip-' + this.props.index)
          .append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', width - margin.left - margin.right)
          .attr('height', height - margin.top - margin.bottom);

        this.attributes = this.plot.append('g');

        if (this.context.chart.settings.zoomMode) {
          this.brush = d3
            .brush()
            .extent([
              [margin.left, margin.top],
              [width - margin.right, height - margin.bottom],
            ])
            .on('end', this.handleZoomChange);

          this.svg.append('g').attr('class', 'brush').call(this.brush);
        }

        if (cb) {
          cb();
        }
      },
    );
  };

  drawAxes = (cb) => {
    const { width, height, margin } = this.state.visBox;

    let xNum = 0,
      xMax = 0,
      xSteps = [];

    this.context.traceList?.traces.forEach((traceModel) =>
      traceModel.series.forEach((series) => {
        if (traceModel.chart !== this.props.index) {
          return;
        }
        const { run, metric, trace } = series;
        if (trace?.num_steps > xMax) {
          xMax = trace.num_steps;
        }
        if (trace?.data.length > xNum) {
          xNum = trace?.data.length;
          xSteps = trace?.data.map((s) => s[1]);
        }
      }),
    );

    const xScale = d3
      .scaleLinear()
      .domain(
        this.context.chart.settings.persistent.zoom?.[this.props.index]?.x ?? [
          0,
          xMax,
        ],
      )
      .range([0, width - margin.left - margin.right]);

    let yMax = null,
      yMin = null;

    if (this.context.chart.settings.persistent.displayOutliers) {
      this.context.traceList?.traces.forEach((traceModel) =>
        traceModel.series.forEach((series) => {
          if (traceModel.chart !== this.props.index) {
            return;
          }
          const { run, metric, trace } = series;
          const traceMax =
            trace && trace.data
              ? Math.max(...trace.data.map((elem) => elem[0]))
              : null;
          const traceMin =
            trace && trace.data
              ? Math.min(...trace.data.map((elem) => elem[0]))
              : null;
          if (yMax == null || traceMax > yMax) {
            yMax = traceMax;
          }
          if (yMin == null || traceMin < yMin) {
            yMin = traceMin;
          }
        }),
      );
    } else {
      let minData = [],
        maxData = [];
      this.context.traceList?.traces.forEach((traceModel) =>
        traceModel.series.forEach((series) => {
          if (traceModel.chart !== this.props.index) {
            return;
          }
          const { run, metric, trace } = series;
          if (trace?.data) {
            trace.data.forEach((elem, elemIdx) => {
              if (minData.length > elemIdx) {
                minData[elemIdx].push(elem[0]);
              } else {
                minData.push([elem[0]]);
              }
              if (maxData.length > elemIdx) {
                maxData[elemIdx].push(elem[0]);
              } else {
                maxData.push([elem[0]]);
              }
            });
          }
        }),
      );

      minData = minData.map((e) => Math.min(...e));
      minData = removeOutliers(minData, 4);

      maxData = maxData.map((e) => Math.max(...e));
      maxData = removeOutliers(maxData, 4);

      yMin = minData[0];
      yMax = maxData[maxData.length - 1];
    }

    let yScaleBase;
    if (this.scale[this.context.chart.settings.yScale] === 'scaleLinear') {
      const diff = yMax - yMin;
      yMax += diff * 0.1;
      yMin -= diff * 0.05;
      yScaleBase = d3.scaleLinear();
    } else if (this.scale[this.context.chart.settings.yScale] === 'scaleLog') {
      yScaleBase = d3.scaleLog();
    }

    const yScale = yScaleBase
      .domain(
        this.context.chart.settings.persistent.zoom?.[this.props.index]?.y ?? [
          yMin,
          yMax,
        ],
      )
      .range([height - margin.top - margin.bottom, 0]);

    this.axes
      .append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${this.state.plotBox.height})`)
      .call(d3.axisBottom(xScale));

    this.axes.append('g').attr('class', 'y axis').call(d3.axisLeft(yScale));

    this.setState(
      {
        ...this.state,
        chart: {
          ...this.state.chart,
          xNum,
          xMax,
          xSteps,
          xScale,
          yScale,
        },
      },
      () => {
        if (cb) {
          cb();
        }
      },
    );
  };

  drawLines = () => {
    const handleLineClick = this.handleLineClick;
    const focused = this.context.chart.focused;
    const highlightMode = this.context.chart.settings.highlightMode;

    const focusedMetric = focused.metric;
    const focusedCircle = focused.circle;
    const focusedLineAttr =
      focusedCircle.runHash !== null ? focusedCircle : focusedMetric;

    const noSelectedRun =
      highlightMode === 'default' || !focusedLineAttr.runHash;

    this.context.traceList?.traces.forEach((traceModel) =>
      traceModel.series.forEach((series) => {
        if (traceModel.chart !== this.props.index) {
          return;
        }
        const { run, metric, trace } = series;
        const line = d3
          .line()
          .x((d) => this.state.chart.xScale(d[1]))
          .y((d) => this.state.chart.yScale(d[0]))
          .curve(
            d3[
              this.curves[
                this.context.chart.settings.persistent.interpolate ? 5 : 0
              ]
            ],
          );

        const traceContext = this.context.contextToHash(trace?.context);

        const active =
          highlightMode === 'run' && focusedLineAttr.runHash === run.run_hash;
        const current =
          focusedLineAttr.runHash === run.run_hash &&
          focusedLineAttr.metricName === metric?.name &&
          focusedLineAttr.traceContext === traceContext;

        this.lines
          .append('path')
          .attr(
            'class',
            `PlotLine PlotLine-${
              run.run_hash
            } PlotLine-${this.context.traceToHash(
              run.run_hash,
              metric?.name,
              traceContext,
            )} ${noSelectedRun ? '' : 'inactive'} ${active ? 'active' : ''} ${
              current ? 'current' : ''
            }`,
          )
          .datum(trace?.data ?? [])
          .attr('d', line)
          .attr('clip-path', 'url(#lines-rect-clip-' + this.props.index + ')')
          .style('fill', 'none')
          .style(
            'stroke',
            this.context.traceList?.grouping?.color?.length > 0
              ? traceModel.color
              : this.context.getMetricColor(run, metric, trace),
          )
          .style(
            'stroke-dasharray',
            this.context.traceList?.grouping?.stroke?.length > 0
              ? traceModel.stroke
              : '0',
          )
          .attr('data-run-hash', run.run_hash)
          .attr('data-metric-name', metric?.name)
          .attr('data-trace-context-hash', traceContext)
          .on('click', function () {
            handleLineClick(d3.mouse(this));
          });
      }),
    );
  };

  drawAggregatedLines = () => {
    const handleLineClick = this.handleLineClick;
    const focused = this.context.chart.focused;
    const focusedMetric = focused.metric;
    const focusedCircle = focused.circle;
    const focusedLineAttr =
      focusedCircle?.runHash !== null
        ? focusedCircle
        : focusedMetric.runHash !== null
          ? focusedMetric
          : null;
    this.context.traceList?.traces.forEach((traceModel) => {
      if (traceModel.chart !== this.props.index) {
        return;
      }

      const {
        run: runAvg,
        metric: metricAvg,
        trace: traceAvg,
      } = traceModel.aggregation.avg;
      const {
        run: runMin,
        metric: metricMin,
        trace: traceMin,
      } = traceModel.aggregation.min;
      const {
        run: runMax,
        metric: metricMax,
        trace: traceMax,
      } = traceModel.aggregation.max;

      const area = d3
        .area()
        .x((d, i) => this.state.chart.xScale(d[1]))
        .y0((d, i) => this.state.chart.yScale(d[0]))
        .y1((d, i) => this.state.chart.yScale(traceMin.data[i][0]))
        .curve(
          d3[
            this.curves[
              this.context.chart.settings.persistent.interpolate ? 5 : 0
            ]
          ],
        );

      const active = traceModel.hasRun(
        focusedLineAttr?.runHash,
        focusedLineAttr?.metricName,
        focusedLineAttr?.traceContext,
      );

      this.lines
        .append('path')
        .attr('class', `PlotArea ${active ? 'active' : ''}`)
        .datum(traceMax.data)
        .attr('d', area)
        .attr('clip-path', 'url(#lines-rect-clip-' + this.props.index + ')')
        .attr(
          'fill',
          Color(
            this.context.traceList?.grouping?.color?.length > 0
              ? traceModel.color
              : this.context.getMetricColor(runAvg, metricAvg, traceAvg),
          )
            .alpha(0.3)
            .hsl()
            .string(),
        )
        .on('click', function () {
          handleLineClick(d3.mouse(this));
        });

      const line = d3
        .line()
        .x((d) => this.state.chart.xScale(d[1]))
        .y((d) => this.state.chart.yScale(d[0]))
        .curve(
          d3[
            this.curves[
              this.context.chart.settings.persistent.interpolate ? 5 : 0
            ]
          ],
        );

      this.lines
        .append('path')
        .attr(
          'class',
          `PlotLine PlotLine-${this.context.traceToHash(
            runAvg.run_hash,
            metricAvg.name,
            traceAvg.context,
          )} ${active ? 'current' : ''}`,
        )
        .datum(traceAvg.data)
        .attr('d', line)
        .attr('clip-path', 'url(#lines-rect-clip-' + this.props.index + ')')
        .style('fill', 'none')
        .style(
          'stroke',
          this.context.traceList?.grouping?.color?.length > 0
            ? traceModel.color
            : this.context.getMetricColor(runAvg, metricAvg, traceAvg),
        )
        .style(
          'stroke-dasharray',
          this.context.traceList?.grouping?.stroke?.length > 0
            ? traceModel.stroke
            : '0',
        )
        .attr('data-run-hash', runAvg.run_hash)
        .attr('data-metric-name', metricAvg.name)
        .attr(
          'data-trace-context-hash',
          this.context.contextToHash(traceAvg.context),
        )
        .on('click', function () {
          handleLineClick(d3.mouse(this));
        });
    });
  };

  drawHoverAttributes = () => {
    const focused = this.context.chart.focused;
    if (focused.runHash === null || focused.circle.active === false) {
      this.hideActionPopUps(false);
    }
    const step = focused.circle.active ? focused.circle.step : focused.step;
    if (step === null || step === undefined) {
      return;
    }

    const x = this.state.chart.xScale(step);
    const { height } = this.state.plotBox;

    // Draw hover line
    this.hoverLine = this.attributes
      .append('line')
      .attr('x1', x)
      .attr('y1', 0)
      .attr('x2', x)
      .attr('y2', height)
      .attr('class', 'HoverLine')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '4 2')
      .style('fill', 'none');

    // Draw circles
    // const runs = this.context.runs.data;
    const focusedMetric = focused.metric;
    const focusedCircle = focused.circle;
    const handlePointClick = this.handlePointClick;
    let focusedCircleElem = null;

    this.circles = this.attributes.append('g');

    this.context.traceList?.traces.forEach((traceModel) =>
      traceModel.series.forEach((series) => {
        if (traceModel.chart !== this.props.index) {
          return;
        }
        const { run, metric, trace } = series;
        const val = this.context.getMetricStepValueByStepIdx(trace?.data, step);
        if (val !== null) {
          const y = this.state.chart.yScale(val);
          const traceContext = this.context.contextToHash(trace?.context);
          const circle = this.circles
            .append('circle')
            .attr(
              'class',
              `HoverCircle HoverCircle-${step} HoverCircle-${this.context.traceToHash(
                run.run_hash,
                metric?.name,
                traceContext,
              )}`,
            )
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', circleRadius)
            .attr('data-x', x)
            .attr('data-y', y)
            .attr('data-step', step)
            .attr('data-run-hash', run.run_hash)
            .attr('data-metric-name', metric?.name)
            .attr(
              'data-trace-context-hash',
              this.context.contextToHash(trace?.context),
            )
            .attr('clip-path', 'url(#lines-rect-clip-' + this.props.index + ')')
            .style(
              'fill',
              this.context.traceList?.grouping?.color?.length > 0
                ? traceModel.color
                : this.context.getMetricColor(run, metric, trace),
            )
            .on('click', function () {
              handlePointClick(step, run.run_hash, metric?.name, traceContext);
            });

          if (
            focusedCircle.active === true &&
            focusedCircle.runHash === run.run_hash &&
            focusedCircle.metricName === metric.name &&
            focusedCircle.traceContext === traceContext &&
            focusedCircle.step === step
          ) {
            focusedCircleElem = circle;
          }
        }
      }),
    );

    // Apply focused state to line and circle
    if (focusedMetric.runHash !== null) {
      this.plot.selectAll('.PlotLine.current').moveToFront();
      this.plot.selectAll('.PlotArea.active').moveToFront();

      this.circles.selectAll('*.focus').moveToFront();
      this.circles
        .selectAll(
          `.HoverCircle-${this.context.traceToHash(
            focusedMetric.runHash,
            focusedMetric.metricName,
            focusedMetric.traceContext,
          )}`,
        )
        .classed('active', true)
        .attr('r', circleActiveRadius)
        .moveToFront();
    }

    // Add focused circle and/or apply focused state
    if (
      focusedCircle.active === true &&
      (this.context.contextFilter.groupByChart.length === 0 ||
        this.context.traceList?.traces
          .filter((trace) => trace.chart === this.props.index)
          .some((traceModel) =>
            traceModel.hasRun(
              focusedCircle.runHash,
              focusedCircle.metricName,
              focusedCircle.traceContext,
            ),
          ))
    ) {
      if (focusedCircleElem !== null) {
        focusedCircleElem
          .classed('focus', true)
          .classed('active', false)
          .attr('r', circleActiveRadius)
          .moveToFront();
      } else {
        const focusedCircleX = this.state.chart.xScale(focusedCircle.step);
        const line = this.context.getTraceData(
          focusedCircle.runHash,
          focusedCircle.metricName,
          focusedCircle.traceContext,
        );
        if (line !== null) {
          const focusedCircleVal = this.context.getMetricStepValueByStepIdx(
            line.data,
            focusedCircle.step,
          );
          if (focusedCircleVal !== null) {
            const focusedCircleY = this.state.chart.yScale(focusedCircleVal);

            this.circles
              .append('circle')
              .attr(
                'class',
                `HoverCircle HoverCircle-${focusedCircle.metricIndex} focus`,
              )
              .attr('cx', focusedCircleX)
              .attr('cy', focusedCircleY)
              .attr('r', circleActiveRadius)
              .attr('data-x', focusedCircleX)
              .attr('data-y', focusedCircleY)
              .attr('data-step', step)
              .attr('data-run-hash', focusedCircle.runHash)
              .attr('data-metric-name', focusedCircle.metricName)
              .attr('data-trace-context-hash', focusedCircle.traceContext)
              .attr(
                'clip-path',
                'url(#lines-rect-clip-' + this.props.index + ')',
              )
              .style(
                'fill',
                this.context.getMetricColor(line.run, line.metric, line.trace),
              )
              .on('click', function () {
                handlePointClick(
                  focusedCircle.runHash,
                  focusedCircle.metricName,
                  focusedCircle.traceContext,
                );
              })
              .moveToFront();
          }
        }
      }

      // Open chart pop up
      let point = null;
      let pos = null;
      const line = this.context.getTraceData(
        focusedCircle.runHash,
        focusedCircle.metricName,
        focusedCircle.traceContext,
      );
      if (line !== null) {
        point = this.context.getMetricStepDataByStepIdx(
          line.data,
          focusedCircle.step,
        );
        if (point !== null) {
          pos = this.positionPopUp(
            this.state.chart.xScale(focusedCircle.step),
            this.state.chart.yScale(point[0]),
          );
        }
      }
      this.hideActionPopUps(false, () => {
        if (line !== null && point !== null) {
          this.setState((prevState) => {
            return {
              ...prevState,
              chartPopUp: {
                left: pos.left,
                top: pos.top,
                width: pos.width,
                height: pos.height,
                display: true,
                selectedTags: [],
                selectedTagsLoading: true,
                run: line.run,
                metric: line.metric,
                trace: line.trace,
                point: point,
              },
            };
          });
          if (this.context.isAimRun(line.run)) {
            this.getCommitTags(line.run.run_hash);
          }
        } else {
          this.context.setChartFocusedState({
            circle: {
              runHash: null,
              metricName: null,
              traceContext: null,
            },
            step: null,
          });
        }
      });
    } else {
      this.hideActionPopUps(false);
    }
  };

  bindInteractions = () => {
    const handleAreaMouseMove = this.handleAreaMouseMove;
    const handleBgRectClick = this.handleBgRectClick;

    this.svg.on('mousemove', function () {
      handleAreaMouseMove(d3.mouse(this));
    });

    this.bgRect.on('click', function () {
      handleBgRectClick(d3.mouse(this));
    });
  };

  idled = () => {
    this.idleTimeout = null;
  };

  handleZoomChange = () => {
    let extent = d3.event.selection;

    // If no selection, back to initial coordinate. Otherwise, update X axis domain
    if (!extent) {
      if (!this.idleTimeout) {
        return (this.idleTimeout = setTimeout(this.idled, 350)); // This allows to wait a little bit
      }
      this.context.setChartSettingsState({
        ...this.context.chart.settings,
        persistent: {
          ...this.context.chart.settings.persistent,
          zoom: null,
        },
      });
    } else {
      const { margin } = this.state.visBox;

      let left = this.state.chart.xScale.invert(extent[0][0] - margin.left);
      let right = this.state.chart.xScale.invert(extent[1][0] - margin.left);

      let top = this.state.chart.yScale.invert(extent[0][1] - margin.top);
      let bottom = this.state.chart.yScale.invert(extent[1][1] - margin.top);

      let [xMin, xMax] = this.state.chart.xScale.domain();
      let [yMin, yMax] = this.state.chart.yScale.domain();

      this.context.setChartSettingsState({
        ...this.context.chart.settings,
        zoomMode: false,
        zoomHistory: [
          [
            this.props.index,
            this.context.chart.settings.persistent.zoom?.[this.props.index] ??
              null,
          ],
        ].concat(this.context.chart.settings.zoomHistory),
        persistent: {
          ...this.context.chart.settings.persistent,
          zoom: {
            ...(this.context.chart.settings.persistent.zoom ?? {}),
            [this.props.index]: {
              x:
                extent[1][0] - extent[0][0] < 50
                  ? null
                  : [left < xMin ? xMin : left, right > xMax ? xMax : right],
              y:
                extent[1][1] - extent[0][1] < 50
                  ? null
                  : [bottom < yMin ? yMin : bottom, top > yMax ? yMax : top],
            },
          },
        },
      });
      // This remove the grey brush area as soon as the selection has been done
      this.svg.select('.brush').call(this.brush.move, null);
    }
  };

  handleAreaMouseMove = (mouse) => {
    // Disable hover effects if circle is focused
    if (this.context.chart.focused.circle.active) {
      return false;
    }

    // Update active state
    this.setActiveLineAndCircle(mouse);

    // Remove hovered line state
    this.unsetHoveredLine(mouse);
  };

  handleVisAreaMouseOut = () => {
    this.unsetHoveredLine();
  };

  handleBgRectClick = (mouse) => {
    if (!this.context.chart.focused.circle.active) {
      return;
    }

    this.context.setChartFocusedState({
      circle: {
        runHash: null,
        metricName: null,
        traceContext: null,
      },
      step: null,
    });

    // Update active state
    this.setActiveLineAndCircle(mouse);
  };

  handleLineClick = (mouse) => {
    if (!this.context.chart.focused.circle.active) {
      return;
    }

    this.context.setChartFocusedState({
      circle: {
        active: false,
        runHash: null,
        metricName: null,
        traceContext: null,
        step: null,
      },
      step: null,
    });

    // Update active state
    this.setActiveLineAndCircle(mouse, false);
  };

  handlePointClick = (step, runHash, metricName, traceContext) => {
    this.context.setChartFocusedState(
      {
        circle: {
          active: true,
          step,
          runHash,
          metricName,
          traceContext,
        },
        metric: {
          runHash: null,
          metricName: null,
          traceContext: null,
        },
      },
      () => {
        setTimeout(() => {
          let activeRow = document.querySelector(
            '.ContextBox__table__cell.active',
          );
          if (activeRow) {
            activeRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        });
      },
    );
  };

  setActiveLineAndCircle = (mouse, marginInc = true) => {
    const { margin } = this.state.visBox;

    if (this.isMouseInVisArea(mouse)) {
      const data = this.state.chart.xSteps;
      const x = marginInc ? mouse[0] - margin.left : mouse[0];
      const y = marginInc ? mouse[1] - margin.top : mouse[1];
      let step = 0;

      if (x >= 0) {
        // Line
        const xPoint = this.state.chart.xScale.invert(x);
        const relIndex = d3.bisect(data, xPoint, 1);
        const a = data[relIndex - 1];
        const b = data[relIndex];

        step = xPoint - a > b - xPoint ? b : a;

        if (step !== this.context.chart.focused.step) {
          this.context.setChartFocusedState({
            step,
          });
        }

        // Find the nearest circle
        if (this.circles) {
          // Circles
          let nearestCircle = [];

          this.circles.selectAll('.HoverCircle').each(function () {
            const elem = d3.select(this);
            const elemY = parseFloat(elem.attr('data-y'));
            const r = Math.abs(elemY - y);

            if (nearestCircle.length === 0 || r < nearestCircle[0].r) {
              nearestCircle = [
                {
                  r: r,
                  nearestCircleRunHash: elem.attr('data-run-hash'),
                  nearestCircleMetricName: elem.attr('data-metric-name'),
                  nearestCircleTraceContext: elem.attr(
                    'data-trace-context-hash',
                  ),
                },
              ];
            } else if (nearestCircle.length && r === nearestCircle[0].r) {
              nearestCircle.push({
                r: r,
                nearestCircleRunHash: elem.attr('data-run-hash'),
                nearestCircleMetricName: elem.attr('data-metric-name'),
                nearestCircleTraceContext: elem.attr('data-trace-context-hash'),
              });
            }
          });

          nearestCircle.sort((a, b) => {
            const aHash = this.context.traceToHash(
              a.nearestCircleRunHash,
              a.nearestCircleMetricName,
              a.nearestCircleTraceContext,
            );
            const bHash = this.context.traceToHash(
              b.nearestCircleRunHash,
              b.nearestCircleMetricName,
              b.nearestCircleTraceContext,
            );
            return aHash > bHash ? 1 : -1;
          });

          if (nearestCircle.length) {
            const nearestCircleRunHash = nearestCircle[0].nearestCircleRunHash;
            const nearestCircleMetricName =
              nearestCircle[0].nearestCircleMetricName;
            const nearestCircleTraceContext =
              nearestCircle[0].nearestCircleTraceContext;

            if (
              nearestCircleRunHash !==
                this.context.chart.focused.metric.runHash ||
              nearestCircleMetricName !==
                this.context.chart.focused.metric.metricName ||
              nearestCircleTraceContext !==
                this.context.chart.focused.metric.traceContext
            ) {
              this.context.setChartFocusedState({
                metric: {
                  runHash: nearestCircleRunHash,
                  metricName: nearestCircleMetricName,
                  traceContext: nearestCircleTraceContext,
                },
              });
            }
          }
        }
      }
    }
  };

  unsetHoveredLine = (mouse = false) => {
    if (mouse === false || !this.isMouseInVisArea(mouse)) {
      this.context.setChartFocusedState({
        metric: {
          runHash: null,
          metricName: null,
          traceContext: null,
        },
      });
    }
  };

  isMouseInVisArea = (mouse) => {
    const { width, height, margin } = this.state.visBox;
    const padding = 5;

    return (
      mouse[0] > margin.left - padding &&
      mouse[0] < width - margin.right + padding &&
      mouse[1] > margin.top - padding &&
      mouse[1] < height - margin.bottom + padding
    );
  };

  /* PopUp Actions */
  positionPopUp = (
    x,
    y,
    chained = null,
    popUpWidth = popUpDefaultWidth,
    popUpHeight = popUpDefaultHeight,
  ) => {
    const { margin } = this.state.visBox;
    const { width, height } = this.state.plotBox;

    // FIXME: improve popup position calculations for grouped charts

    if (popUpWidth > width * 0.75) {
      popUpWidth = Math.floor(width * 0.75);
    }

    if (popUpHeight > height * 0.75) {
      popUpHeight = Math.floor(height * 0.75);
    }

    const leftOverflow = (x) => popUpWidth + x > width;
    const topOverflow = (y) => popUpHeight + y > height;

    let left = 0,
      top = 0,
      chainArrow = null;

    if (chained !== null) {
      if (chained.left + 2 * popUpWidth > width) {
        left = chained.left - popUpWidth;
        chainArrow = 'right';
      } else {
        left = x;
        chainArrow = 'left';
      }
      top = chained.top;
    } else {
      if (leftOverflow(x)) {
        left = x - popUpWidth + margin.left;
      } else {
        left = x + margin.left;
      }

      top = y + margin.top - Math.floor(popUpHeight / 2);

      if (topOverflow(top)) {
        top = height - popUpHeight;
      } else if (top < 0) {
        top = margin.top;
      }
    }

    return {
      left,
      top,
      width: popUpWidth,
      height: popUpHeight,
      chainArrow,
    };
  };

  hideActionPopUps = (onlySecondary = false, callback = null) => {
    this.setState(
      (prevState) => {
        const state = {
          ...prevState,
          tagPopUp: {
            ...prevState.tagPopUp,
            display: false,
          },
          commitPopUp: {
            ...prevState.tagPopUp,
            display: false,
          },
        };

        if (!onlySecondary) {
          Object.assign(state, {
            chartPopUp: {
              ...prevState.chartPopUp,
              display: false,
            },
          });
        }

        return state;
      },
      () => {
        if (callback) {
          callback();
        }
      },
    );
  };

  getCommitTags = (runHash) => {
    this.props
      .getCommitTags(runHash)
      .then((data) => {
        this.setState((prevState) => ({
          ...prevState,
          chartPopUp: {
            ...prevState.chartPopUp,
            selectedTags: data,
          },
        }));
      })
      .catch(() => {
        this.setState((prevState) => ({
          ...prevState,
          chartPopUp: {
            ...prevState.chartPopUp,
            selectedTags: [],
          },
        }));
      })
      .finally(() => {
        this.setState((prevState) => ({
          ...prevState,
          chartPopUp: {
            ...prevState.chartPopUp,
            selectedTagsLoading: false,
          },
        }));
      });
  };

  handleTagItemClick = (runHash, experimentName, tag) => {
    this.setState((prevState) => ({
      ...prevState,
      chartPopUp: {
        ...prevState.chartPopUp,
        selectedTagsLoading: true,
      },
    }));

    this.props
      .updateCommitTag({
        commit_hash: runHash,
        tag_id: tag.id,
        experiment_name: experimentName,
      })
      .then((tagsIds) => {
        this.getCommitTags(runHash);

        // Update metrics
        // const data = [...this.context.runs.data];
        // data.forEach((i) => {
        //   if (i.hash === runHash) {
        //     i.tag = tag;
        //   }
        // });
        // this.context.setRunsState({
        //   ...this.context.runs,
        //   data: data,
        // });
      });
  };

  handleAttachTagClick = () => {
    const pos = this.positionPopUp(
      this.state.chartPopUp.left + popUpDefaultWidth,
      this.state.chartPopUp.top,
      this.state.chartPopUp,
    );

    this.setState((prevState) => ({
      ...prevState,
      tagPopUp: {
        ...prevState.tagPopUp,
        ...pos,
        display: true,
        isLoading: true,
      },
    }));

    this.hideActionPopUps(true, () => {
      this.props.getTags().then((data) => {
        this.setState((prevState) => ({
          ...prevState,
          tagPopUp: {
            ...prevState.tagPopUp,
            display: true,
            tags: data,
            isLoading: false,
          },
        }));
      });
    });
  };

  handleProcessKill = (pid, runHash, experimentName) => {
    this.setState((prevState) => ({
      ...prevState,
      commitPopUp: {
        ...prevState.commitPopUp,
        processKillBtn: {
          loading: true,
          disabled: true,
        },
      },
    }));

    this.props.killRunningExecutable(pid).then((data) => {
      // this.getProcesses();
      this.handleCommitInfoClick(runHash, experimentName);
    });
  };

  handleCommitInfoClick = (runHash, experimentName) => {
    const pos = this.positionPopUp(
      this.state.chartPopUp.left + popUpDefaultWidth,
      this.state.chartPopUp.top,
      this.state.chartPopUp,
    );

    this.hideActionPopUps(true, () => {
      this.setState((prevState) => ({
        ...prevState,
        commitPopUp: {
          ...prevState.commitPopUp,
          display: true,
          left: pos.left,
          top: pos.top,
          width: pos.width,
          height: pos.height,
          chainArrow: pos.chainArrow,
          processKillBtn: {
            loading: false,
            disabled: false,
          },
          isLoading: true,
        },
      }));

      this.props.getCommitInfo(experimentName, runHash).then((data) => {
        this.setState((prevState) => ({
          ...prevState,
          commitPopUp: {
            ...prevState.commitPopUp,
            isLoading: false,
            data,
          },
        }));
      });
    });
  };

  _renderPopUpContent = () => {
    const { run, metric, trace, point } = this.state.chartPopUp;
    const commitPopUpData = this.state.commitPopUp.data;

    // FIXME: improve checking of containing current run
    return this.context.contextFilter.groupByChart.length === 0 ||
      this.context.traceList?.traces
        .filter((trace) => trace.chart === this.props.index)
        .some((traceModel) =>
          traceModel.hasRun(
            run?.run_hash,
            metric?.name,
            this.context.contextToHash(trace?.context),
          ),
        ) ? (
        <div className="PanelChart__body">
          {this.state.chartPopUp.display && (
            <PopUp
              className="ChartPopUp"
              left={this.state.chartPopUp.left}
              top={this.state.chartPopUp.top}
              width={this.state.chartPopUp.width}
              height={this.state.chartPopUp.height}
              xGap={true}
            >
              <div>
                {this.context.isAimRun(run) && (
                  <div>
                    {!this.state.chartPopUp.selectedTagsLoading ? (
                      <div className="PanelChart__popup__tags__wrapper">
                        <UI.Text overline type="grey-darker">
                        tag
                        </UI.Text>
                        <div className="PanelChart__popup__tags">
                          {this.state.chartPopUp.selectedTags.length ? (
                          <>
                            {this.state.chartPopUp.selectedTags.map(
                              (tagItem, i) => (
                                <UI.Label key={i} color={tagItem.color}>
                                  {tagItem.name}
                                </UI.Label>
                              ),
                            )}
                          </>
                          ) : (
                            <UI.Label>No attached tag</UI.Label>
                          )}
                          <div
                            className="PanelChart__popup__tags__update"
                            onClick={() => this.handleAttachTagClick()}
                          >
                            <UI.Icon i="edit" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <UI.Text type="grey" center spacingTop spacing>
                      Loading..
                      </UI.Text>
                    )}
                    <UI.Line />
                  </div>
                )}
                <UI.Text type="grey-dark">
                  <span>Value: {Math.round(point[0] * 10e9) / 10e9}</span>
                </UI.Text>
                {point[2] !== null && (
                  <UI.Text type="grey" small>
                  Epoch: {point[2]}
                  </UI.Text>
                )}
                <UI.Text type="grey" small>
                Step: {point[1]}
                  {this.context.isTFSummaryScalar(run) && (
                  <> (local step: {point[4]}) </>
                  )}
                </UI.Text>
                {this.context.isAimRun(run) && (
                <>
                  <UI.Line />
                  <Link
                    to={buildUrl(HUB_PROJECT_EXPERIMENT, {
                      experiment_name: run.experiment_name,
                      commit_id: run.run_hash,
                    })}
                  >
                    <UI.Text type="primary">Run Details</UI.Text>
                  </Link>
                  <UI.Text type="grey" small>
                    Experiment: {run.experiment_name}
                  </UI.Text>
                  <UI.Text type="grey" small>
                    Hash: {run.run_hash}
                  </UI.Text>
                </>
                )}
                {this.context.isTFSummaryScalar(run) && (
                <>
                  <div className="PanelChart__popup__tags__wrapper">
                    <UI.Text overline type="grey-darker">
                      tag
                    </UI.Text>
                    <div className="PanelChart__popup__tags">
                      <UI.Label>{metric.tag.name}</UI.Label>
                    </div>
                  </div>
                  <UI.Line />
                  <UI.Text overline type="grey-darker">
                    tf.summary scalar
                  </UI.Text>
                  <UI.Text type="grey-dark">{run.name}</UI.Text>
                  {/*<UI.Text type='grey' small>{moment.unix(run.date).format('HH:mm · D MMM, YY')}</UI.Text>*/}
                  <UI.Line />
                </>
                )}
              </div>
            </PopUp>
          )}
          {this.state.tagPopUp.display && (
            <PopUp
              className="TagPopUp"
              left={this.state.tagPopUp.left}
              top={this.state.tagPopUp.top}
              chainArrow={this.state.tagPopUp.chainArrow}
              xGap={true}
            >
              {this.state.tagPopUp.isLoading ? (
                <UI.Text type="grey" center>
                Loading..
                </UI.Text>
              ) : (
                <div className="TagPopUp__tags">
                  <div className="TagPopUp__tags__title">
                    <UI.Text type="grey" inline>
                    Select a tag
                    </UI.Text>
                    <Link to={HUB_PROJECT_CREATE_TAG}>
                      <UI.Button type="positive" size="tiny">
                      Create
                      </UI.Button>
                    </Link>
                  </div>
                  <UI.Line spacing={false} />
                  <div className="TagPopUp__tags__box">
                    {!this.state.tagPopUp.tags.length && (
                      <UI.Text type="grey" center spacingTop spacing>
                      Empty
                      </UI.Text>
                    )}
                    {this.state.tagPopUp.tags.map((tag, tagKey) => (
                      <UI.Label
                        className={classNames({
                          TagPopUp__tags__item: true,
                          active: this.state.chartPopUp.selectedTags
                            .map((i) => i.id)
                            .includes(tag.id),
                        })}
                        key={tagKey}
                        color={tag.color}
                        onClick={() =>
                          this.handleTagItemClick(
                            run.run_hash,
                            run.experiment_name,
                            tag,
                          )
                        }
                      >
                        {tag.name}
                      </UI.Label>
                    ))}
                  </div>
                </div>
              )}
            </PopUp>
          )}
          {this.state.commitPopUp.display && (
            <PopUp
              className="CommitPopUp"
              left={this.state.commitPopUp.left}
              top={this.state.commitPopUp.top}
              chainArrow={this.state.commitPopUp.chainArrow}
              xGap={true}
            >
              {this.state.commitPopUp.isLoading ? (
                <UI.Text type="grey" center>
                Loading..
                </UI.Text>
              ) : (
              <>
                {/*<UI.Text type='grey' small>*/}
                {/*  {moment.unix(lineData.date).format('HH:mm · D MMM, YY')}*/}
                {/*</UI.Text>*/}
                <Link
                  to={buildUrl(HUB_PROJECT_EXPERIMENT, {
                    experiment_name: run.experiment_name,
                    commit_id: run.run_hash,
                  })}
                >
                  <UI.Text type="primary">Detailed View</UI.Text>
                </Link>
                <UI.Line />
                <UI.Text type="grey" small>
                  Experiment: {run.experiment_name}
                </UI.Text>
                <UI.Text type="grey" small>
                  Hash: {run.run_hash}
                </UI.Text>
                {!!commitPopUpData.process && (
                  <>
                    <UI.Line />
                    {!!commitPopUpData.process.uuid && (
                      <Link
                        to={buildUrl(HUB_PROJECT_EXECUTABLE_PROCESS_DETAIL, {
                          process_id: commitPopUpData.process.uuid,
                        })}
                      >
                        <UI.Text>Process</UI.Text>
                      </Link>
                    )}
                    <UI.Text type="grey" small>
                      Process status:{' '}
                      {commitPopUpData.process.finish ? 'finished' : 'running'}
                    </UI.Text>
                    {!!commitPopUpData.process.start_date && (
                      <UI.Text type="grey" small>
                        Time:{' '}
                        {Math.round(
                          commitPopUpData.process.finish
                            ? commitPopUpData.date -
                                commitPopUpData.process.start_date
                            : commitPopUpData.process.time || '-',
                        )}
                      </UI.Text>
                    )}
                    {!!commitPopUpData.process.pid && (
                      <div className="CommitPopUp__process">
                        <UI.Text type="grey" small inline>
                          PID: {commitPopUpData.process.pid}{' '}
                        </UI.Text>
                        <UI.Button
                          onClick={() =>
                            this.handleProcessKill(
                              commitPopUpData.process.pid,
                              run.run_hash,
                              run.experiment_name,
                            )
                          }
                          type="negative"
                          size="tiny"
                          inline
                          {...this.state.commitPopUp.processKillBtn}
                        >
                          Kill
                        </UI.Button>
                      </div>
                    )}
                  </>
                )}
              </>
              )}
            </PopUp>
          )}
        </div>
      ) : null;
  };

  _renderPanelMsg = (Elem) => {
    return <div className="PanelChart__msg__wrapper">{Elem}</div>;
  };

  render() {
    const styles = {};

    if (this.props.width !== null) {
      styles.width = this.props.width;
    }
    if (this.props.height !== null) {
      styles.height = this.props.height;
    }

    return (
      <div className="PanelChart" ref={this.parentRef} style={styles}>
        <div ref={this.visRef} className="PanelChart__svg" />
        {this._renderPopUpContent()}
      </div>
    );
  }
}

PanelChart.defaultProps = {
  width: null,
  height: null,
  ratio: null,
  index: 0,
};

PanelChart.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  ratio: PropTypes.number,
  index: PropTypes.number,
};

PanelChart.contextType = HubMainScreenContext;

export default storeUtils.getWithState(classes.PANEL_CHART, PanelChart);
