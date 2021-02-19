import './PanelChart.less';

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Color from 'color';
import * as _ from 'lodash';
import * as moment from 'moment';
import humanizeDuration from 'humanize-duration';

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
import { HubMainScreenModel } from '../../../../models/HubMainScreenModel';

const d3 = require('d3');

const popUpDefaultWidth = 250;
const popUpDefaultHeight = 200;
const circleRadius = 3;
const circleActiveRadius = 5;

const curveOptions = [
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

const scaleOptions = ['scaleLinear', 'scaleLog'];

const shortEnglishHumanizer = humanizeDuration.humanizer({
  language: 'shortEn',
  languages: {
    shortEn: {
      y: () => 'y',
      mo: () => 'mo',
      w: () => 'w',
      d: () => 'd',
      h: () => 'h',
      m: () => 'm',
      s: () => 's',
      ms: () => 'ms',
    },
  },
  units: ['d', 'h', 'm', 's'],
  spacer: '',
  delimiter: ' ',
});

function PanelChart(props) {
  let visBox = useRef({
    margin: {
      top: 20,
      right: 20,
      bottom: 30,
      left: 60,
    },
    height: null,
    width: null,
  });
  let plotBox = useRef({
    height: null,
    width: null,
  });
  let chartOptions = useRef({
    xNum: 0,
    xMax: 0,
    xSteps: [],
    xScale: null,
    yScale: null,
  });
  let [chartPopUp, setChartPopUp] = useState({
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
  });
  let [tagPopUp, setTagPopUp] = useState({
    display: false,
    isLoading: false,
    left: 0,
    top: 0,
    tags: [],
  });
  let [commitPopUp, setCommitPopUp] = useState({
    display: false,
    isLoading: false,
    left: 0,
    top: 0,
    data: null,
    processKillBtn: {
      loading: false,
      disabled: false,
    },
  });

  let {
    setChartFocusedState,
    setChartFocusedActiveState,
    setChartSettingsState,
  } = HubMainScreenModel.emitters;

  let {
    contextToHash,
    traceToHash,
    getTraceData,
    getMetricColor,
    isAimRun,
    isTFSummaryScalar,
    getClosestStepData,
  } = HubMainScreenModel.helpers;

  const parentRef = useRef();
  const visRef = useRef();
  const svg = useRef(null);
  const plot = useRef(null);
  const bgRect = useRef(null);
  const hoverLine = useRef(null);
  const axes = useRef(null);
  const lines = useRef(null);
  const circles = useRef(null);
  const attributes = useRef(null);
  const brush = useRef(null);
  const idleTimeout = useRef(null);

  function initD3() {
    d3.selection.prototype.moveToFront = function () {
      return this.each(function () {
        this.parentNode.appendChild(this);
      });
    };
  }

  function renderChart() {
    clear();
    draw();
  }

  function clear() {
    if (!visRef.current) {
      return;
    }

    const visArea = d3.select(visRef.current);
    visArea.selectAll('*').remove();
    visArea.attr('style', null);
  }

  function draw() {
    if (!visRef.current) {
      return;
    }

    drawArea();
    drawAxes();
    drawData();
    bindInteractions();
  }

  function drawData() {
    const { contextFilter } = HubMainScreenModel.getState();
    if (contextFilter.aggregated) {
      drawAggregatedLines();
    } else {
      drawLines();
    }
    drawHoverAttributes();
  }

  function drawArea() {
    const { traceList, chart } = HubMainScreenModel.getState();
    const parent = d3.select(parentRef.current);
    const visArea = d3.select(visRef.current);
    const parentRect = parent.node().getBoundingClientRect();
    const parentWidth = parentRect.width;
    const parentHeight = parentRect.height;

    const { margin } = visBox.current;
    const width = parentWidth;
    const height = parentHeight;

    visBox.current = {
      ...visBox.current,
      width,
      height,
    };
    plotBox.current = {
      ...plotBox.current,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
    };

    visArea.style('width', `${width}px`).style('height', `${height}px`);

    svg.current = visArea
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('xmlns', 'http://www.w3.org/2000/svg'); // .attr('id', 'panel_svg');

    if (traceList?.grouping.chart) {
      svg.current
        .append('text')
        .attr('x', width / 2)
        .attr('y', margin.top)
        .attr('text-anchor', 'middle')
        .style('font-size', '0.7em')
        .text(
          traceList?.grouping.chart.length > 0
            ? `#${props.index + 1} ${traceList?.grouping.chart
              .map((key) => {
                return (
                  key +
                    '=' +
                    formatValue(
                      traceList.traces.find(
                        (elem) => elem.chart === props.index,
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
          traceList?.grouping.chart.length > 0
            ? `#${props.index + 1} ${traceList?.grouping.chart
              .map((key) => {
                return (
                  key +
                    '=' +
                    formatValue(
                      traceList.traces.find(
                        (elem) => elem.chart === props.index,
                      )?.config[key],
                      false,
                    )
                );
              })
              .join(', ')}`
            : '',
        );
    }

    bgRect.current = svg.current
      .append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', width - margin.left - margin.right)
      .attr('height', height - margin.top - margin.bottom)
      .style('fill', 'transparent');

    plot.current = svg.current
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    axes.current = plot.current.append('g').attr('class', 'Axes');

    lines.current = plot.current.append('g').attr('class', 'Lines');
    lines.current
      .append('clipPath')
      .attr('id', 'lines-rect-clip-' + props.index)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width - margin.left - margin.right)
      .attr('height', height - margin.top - margin.bottom);

    attributes.current = plot.current.append('g');
    attributes.current
      .append('clipPath')
      .attr('id', 'circles-rect-clip-' + props.index)
      .append('rect')
      .attr('x', -7)
      .attr('y', 0)
      .attr('width', width - margin.left - margin.right + 14)
      .attr('height', height - margin.top - margin.bottom);

    if (chart.settings.zoomMode) {
      brush.current = d3
        .brush()
        .extent([
          [margin.left, margin.top],
          [width - margin.right, height - margin.bottom],
        ])
        .on('end', handleZoomChange);

      svg.current.append('g').attr('class', 'brush').call(brush.current);
    }
  }

  function drawAxes() {
    const { traceList, chart } = HubMainScreenModel.getState();
    const { width, height, margin } = visBox.current;
    const xAlignment = chart.settings.persistent.xAlignment;

    let xNum = 0;
    let xMax = 0;
    let xMin = Infinity;
    let xSteps = [];
    let xTicks = [];

    if (xAlignment === 'epoch' && traceList.epochSteps[props.index]) {
      xTicks = Object.keys(traceList.epochSteps[props.index]).map((epoch) => {
        return [
          traceList.epochSteps[props.index][epoch][0],
          epoch === 'null' ? null : epoch,
        ];
      });
    }

    traceList?.traces.forEach((traceModel) => {
      traceModel.series.forEach((series) => {
        if (traceModel.chart !== props.index) {
          return;
        }
        const { run, metric, trace } = series;
        const max = trace.axisValues[trace.axisValues.length - 1];
        const min = trace.axisValues[0];
        if (max > xMax) {
          xMax = max;
        }
        if (min < xMin) {
          xMin = min;
        }

        xSteps = _.uniq(xSteps.concat(trace.axisValues).sort((a, b) => a - b));
        xNum = xSteps.length;
      });
    });

    const xScale = d3
      .scaleLinear()
      .domain(chart.settings.persistent.zoom?.[props.index]?.x ?? [xMin, xMax])
      .range([0, width - margin.left - margin.right]);

    let yMax = null,
      yMin = null;

    if (chart.settings.persistent.displayOutliers) {
      traceList?.traces.forEach((traceModel) =>
        traceModel.series.forEach((series) => {
          if (traceModel.chart !== props.index) {
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
      traceList?.traces.forEach((traceModel) =>
        traceModel.series.forEach((series) => {
          if (traceModel.chart !== props.index) {
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
    if (scaleOptions[chart.settings.yScale] === 'scaleLinear') {
      if (yMax === yMin) {
        yMax += 1;
        yMin -= 1;
      } else {
        const diff = yMax - yMin;
        yMax += diff * 0.1;
        yMin -= diff * 0.05;
      }
      yScaleBase = d3.scaleLinear();
    } else if (scaleOptions[chart.settings.yScale] === 'scaleLog') {
      yScaleBase = d3.scaleLog();
    }

    const yScale = yScaleBase
      .domain(chart.settings.persistent.zoom?.[props.index]?.y ?? [yMin, yMax])
      .range([height - margin.top - margin.bottom, 0]);

    let xAxisTicks = d3.axisBottom(xScale);

    if (xAlignment === 'epoch') {
      xAxisTicks
        .tickValues(xTicks.map((tick) => tick[0]))
        .tickFormat((d, i) => xTicks[i][1]);
    } else if (xAlignment === 'relative_time') {
      const ticksCount = Math.floor(plotBox.current.width / 85);
      xAxisTicks
        .ticks(ticksCount > 1 ? ticksCount - 1 : 1)
        .tickFormat((d, i) => shortEnglishHumanizer(+d * 1000));
    } else if (xAlignment === 'absolute_time') {
      const ticksCount = Math.floor(plotBox.current.width / 120);
      xAxisTicks
        .ticks(ticksCount > 1 ? ticksCount - 1 : 1)
        .tickFormat((d, i) => moment.unix(d).format('HH:mm:ss D MMM, YY'));
    }

    axes.current
      .append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${plotBox.current.height})`)
      .call(xAxisTicks);

    svg.current
      .append('text')
      .attr(
        'transform',
        `translate(
        ${visBox.current.width - 20},
        ${visBox.current.height - visBox.current.margin.bottom - 5}
      )`,
      )
      .attr('text-anchor', 'end')
      .attr('alignment-baseline', 'ideographic')
      .style('font-size', '0.7em')
      .style('text-transform', 'capitalize')
      .style('fill', 'var(--grey)')
      .text(
        xAlignment
          ? `${xAlignment.replace('_', ' ')}${
              xAlignment === 'step' || xAlignment === 'epoch' ? 's' : ''
            }`
          : 'steps',
      );

    axes.current.append('g').attr('class', 'y axis').call(d3.axisLeft(yScale));

    chartOptions.current = {
      ...chartOptions.current,
      xNum,
      xMax,
      xSteps,
      xScale,
      yScale,
    };
  }

  function drawLines() {
    const { traceList, chart } = HubMainScreenModel.getState();
    const highlightMode = chart.settings.highlightMode;

    const focusedMetric = chart.focused.metric;
    const focusedCircle = chart.focused.circle;
    const focusedLineAttr =
      focusedCircle.runHash !== null ? focusedCircle : focusedMetric;

    const noSelectedRun =
      highlightMode === 'default' || !focusedLineAttr.runHash;

    let runIndex = 0;

    traceList?.traces.forEach((traceModel) =>
      traceModel.series.forEach((series) => {
        if (traceModel.chart !== props.index) {
          return;
        }
        const { run, metric, trace } = series;
        const line = d3
          .line()
          .x((d, i) => chartOptions.current.xScale(trace.axisValues[i]))
          .y((d) => chartOptions.current.yScale(d[0]))
          .curve(
            d3[curveOptions[chart.settings.persistent.interpolate ? 5 : 0]],
          );

        const traceContext = contextToHash(trace?.context);

        const active =
          highlightMode === 'run' && focusedLineAttr.runHash === run.run_hash;
        const current =
          focusedLineAttr.runHash === run.run_hash &&
          focusedLineAttr.metricName === metric?.name &&
          focusedLineAttr.traceContext === traceContext;

        lines.current
          .append('path')
          .attr(
            'class',
            `PlotLine PlotLine-${run.run_hash} PlotLine-${traceToHash(
              run.run_hash,
              metric?.name,
              traceContext,
            )} ${noSelectedRun ? '' : 'inactive'} ${active ? 'active' : ''} ${
              current ? 'current' : ''
            }`,
          )
          .datum(trace?.data ?? [])
          .attr('d', line)
          .attr('clip-path', 'url(#lines-rect-clip-' + props.index + ')')
          .style('fill', 'none')
          .style(
            'stroke',
            traceList?.grouping?.color?.length > 0
              ? traceModel.color
              : getMetricColor(run, metric, trace, runIndex),
          )
          .style(
            'stroke-dasharray',
            traceList?.grouping?.stroke?.length > 0 ? traceModel.stroke : '0',
          )
          .attr('data-run-hash', run.run_hash)
          .attr('data-metric-name', metric?.name)
          .attr('data-trace-context-hash', traceContext)
          .on('click', function () {
            handleLineClick(d3.mouse(this));
          });

        runIndex++;
      }),
    );
  }

  function drawAggregatedLines() {
    const { traceList, chart } = HubMainScreenModel.getState();
    const focusedMetric = chart.focused.metric;
    const focusedCircle = chart.focused.circle;
    const highlightMode = chart.settings.highlightMode;
    const focusedLineAttr =
      focusedCircle?.runHash !== null
        ? focusedCircle
        : focusedMetric.runHash !== null
          ? focusedMetric
          : null;
    traceList?.traces.forEach((traceModel) => {
      if (traceModel.chart !== props.index) {
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
        .x((d, i) => chartOptions.current.xScale(d[1]))
        .y0((d, i) => chartOptions.current.yScale(d[0]))
        .y1((d, i) => chartOptions.current.yScale(traceMin.data[i][0]))
        .curve(d3[curveOptions[chart.settings.persistent.interpolate ? 5 : 0]]);

      const noSelectedRun =
        highlightMode === 'default' || !focusedLineAttr?.runHash;

      const active =
        highlightMode === 'run'
          ? traceModel.hasRunWithRunHash(focusedLineAttr?.runHash)
          : traceModel.hasRun(
              focusedLineAttr?.runHash,
              focusedLineAttr?.metricName,
              focusedLineAttr?.traceContext,
          );

      lines.current
        .append('path')
        .attr(
          'class',
          `PlotArea ${noSelectedRun ? '' : 'inactive'} ${
            active ? 'active' : ''
          }`,
        )
        .datum(traceMax.data)
        .attr('d', area)
        .attr('clip-path', 'url(#lines-rect-clip-' + props.index + ')')
        .attr(
          'fill',
          Color(
            traceList?.grouping?.color?.length > 0
              ? traceModel.color
              : getMetricColor(runAvg, metricAvg, traceAvg),
          )
            .alpha(0.3)
            .hsl()
            .string(),
        )
        .on('click', function () {
          handleLineClick(d3.mouse(this));
        });

      const avgLine = d3
        .line()
        .x((d) => chartOptions.current.xScale(d[1]))
        .y((d) => chartOptions.current.yScale(d[0]))
        .curve(d3[curveOptions[chart.settings.persistent.interpolate ? 5 : 0]]);

      lines.current
        .append('path')
        .attr(
          'class',
          `PlotLine PlotLine-${traceToHash(
            runAvg.run_hash,
            metricAvg.name,
            traceAvg.context,
          )} ${active ? '' : 'inactive'}`,
        )
        .datum(traceAvg.data)
        .attr('d', avgLine)
        .attr('clip-path', 'url(#lines-rect-clip-' + props.index + ')')
        .style('fill', 'none')
        .style(
          'stroke',
          traceList?.grouping?.color?.length > 0
            ? traceModel.color
            : getMetricColor(runAvg, metricAvg, traceAvg),
        )
        .style(
          'stroke-dasharray',
          traceList?.grouping?.stroke?.length > 0 ? traceModel.stroke : '0',
        )
        .attr('data-run-hash', runAvg.run_hash)
        .attr('data-metric-name', metricAvg.name)
        .attr('data-trace-context-hash', contextToHash(traceAvg.context))
        .on('click', function () {
          handleLineClick(d3.mouse(this));
        });

      if (!noSelectedRun) {
        traceModel.series.forEach((series) => {
          if (traceModel.chart !== props.index) {
            return;
          }
          const { run, metric, trace } = series;
          const traceContext = contextToHash(trace?.context);
          let activeRun =
            highlightMode === 'run'
              ? focusedLineAttr.runHash === run.run_hash
              : false;
          const current =
            focusedLineAttr.runHash === run.run_hash &&
            focusedLineAttr.metricName === metric?.name &&
            focusedLineAttr.traceContext === traceContext;
          if (!current && !activeRun) {
            return;
          }
          const focusedLine = d3
            .line()
            .x((d, i) => chartOptions.current.xScale(trace.axisValues[i]))
            .y((d) => chartOptions.current.yScale(d[0]))
            .curve(
              d3[curveOptions[chart.settings.persistent.interpolate ? 5 : 0]],
            );

          lines.current
            .append('path')
            .attr(
              'class',
              `PlotLine PlotLine-${
                focusedLineAttr?.runHash
              } PlotLine-${traceToHash(
                focusedLineAttr?.runHash,
                focusedLineAttr?.metricName,
                focusedLineAttr?.traceContext,
              )} ${activeRun ? 'active' : ''} ${current ? 'current' : ''}`,
            )
            .datum(trace?.data ?? [])
            .attr('d', focusedLine)
            .attr('clip-path', 'url(#lines-rect-clip-' + props.index + ')')
            .style('fill', 'none')
            .style(
              'stroke',
              traceList?.grouping?.color?.length > 0
                ? traceModel.color
                : getMetricColor(run, metric, trace),
            )
            .style(
              'stroke-dasharray',
              traceList?.grouping?.stroke?.length > 0 ? traceModel.stroke : '0',
            )
            .attr('data-run-hash', run.run_hash)
            .attr('data-metric-name', metric?.name)
            .attr('data-trace-context-hash', traceContext)
            .on('click', function () {
              handleLineClick(d3.mouse(this));
            });
        });
      }
    });
  }

  function drawHoverAttributes() {
    const { chart, traceList, contextFilter } = HubMainScreenModel.getState();
    const highlightMode = chart.settings.highlightMode;
    const focused = chart.focused;
    if (focused.circle.runHash === null || focused.circle.active === false) {
      hideActionPopUps(false);
    }
    let step = focused.circle.active ? focused.circle.step : focused.step;
    if (step === null || step === undefined) {
      return;
    }

    let x = chartOptions.current.xScale(step);
    const { height } = plotBox.current;

    // Draw hover line
    hoverLine.current = attributes.current
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
    const focusedMetric = focused.metric;
    const focusedCircle = focused.circle;
    const focusedLineAttr =
      focusedCircle.runHash !== null ? focusedCircle : focusedMetric;
    let focusedCircleElem = null;

    circles.current = attributes.current.append('g');

    let runIndex = 0;

    traceList?.traces.forEach((traceModel) =>
      traceModel.series.forEach((series) => {
        if (traceModel.chart !== props.index) {
          return;
        }
        const { run, metric, trace } = series;
        let { closestStep, stepData } = getClosestStepData(
          step,
          trace?.data,
          trace?.axisValues,
        );

        let val = stepData?.[0] ?? null;
        x = chartOptions.current.xScale(closestStep);

        if (val !== null) {
          const y = chartOptions.current.yScale(val);
          const traceContext = contextToHash(trace?.context);

          let shouldHighlightCircle;
          if (highlightMode === 'default' || !focusedLineAttr.runHash) {
            shouldHighlightCircle = true;
          } else if (highlightMode === 'run') {
            shouldHighlightCircle = focusedLineAttr.runHash === run.run_hash;
          } else if (highlightMode === 'metric') {
            shouldHighlightCircle =
              focusedLineAttr.runHash === run.run_hash &&
              focusedLineAttr.metricName === metric?.name &&
              focusedLineAttr.traceContext === traceContext;
          } else {
            shouldHighlightCircle = false;
          }

          const circle = circles.current
            .append('circle')
            .attr(
              'class',
              `HoverCircle HoverCircle-${closestStep} ${
                shouldHighlightCircle ? '' : 'inactive'
              } HoverCircle-${traceToHash(
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
            .attr('data-step', closestStep)
            .attr('data-run-hash', run.run_hash)
            .attr('data-metric-name', metric?.name)
            .attr('data-trace-context-hash', contextToHash(trace?.context))
            .attr('clip-path', 'url(#circles-rect-clip-' + props.index + ')')
            .style(
              'fill',
              traceList?.grouping?.color?.length > 0
                ? traceModel.color
                : getMetricColor(run, metric, trace, runIndex),
            )
            .on('click', function () {
              handlePointClick(
                closestStep,
                run.run_hash,
                metric?.name,
                traceContext,
              );
            });

          runIndex++;

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
      plot.current.selectAll('.PlotArea.active').moveToFront();
      plot.current.selectAll('.PlotLine.current').moveToFront();

      circles.current.selectAll('*.focus').moveToFront();
      circles.current
        .selectAll(
          `.HoverCircle-${traceToHash(
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
      (contextFilter.groupByChart.length === 0 ||
        traceList?.traces
          .filter((trace) => trace.chart === props.index)
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
        const focusedCircleX = chartoptions.current.xScale(focusedCircle.step);
        const line = getTraceData(
          focusedCircle.runHash,
          focusedCircle.metricName,
          focusedCircle.traceContext,
        );
        if (line !== null) {
          const focusedCircleVal =
            line?.data?.[line?.axisValues?.indexOf(focusedCircle.step)]?.[0] ??
            null;
          if (focusedCircleVal !== null) {
            const focusedCircleY = chartOptions.current.yScale(
              focusedCircleVal,
            );

            circles.current
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
              .attr('data-step', closestStep)
              .attr('data-run-hash', focusedCircle.runHash)
              .attr('data-metric-name', focusedCircle.metricName)
              .attr('data-trace-context-hash', focusedCircle.traceContext)
              .attr('clip-path', 'url(#lines-rect-clip-' + props.index + ')')
              .style('fill', getMetricColor(line.run, line.metric, line.trace))
              .on('click', function () {
                handlePointClick(
                  closestStep,
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
      const line = getTraceData(
        focusedCircle.runHash,
        focusedCircle.metricName,
        focusedCircle.traceContext,
      );
      if (line !== null) {
        point =
          line?.data?.[line?.axisValues?.indexOf(focusedCircle.step)] ?? null;
        if (point !== null) {
          pos = positionPopUp(
            chartOptions.current.xScale(focusedCircle.step),
            chartOptions.current.yScale(point[0]),
          );
        }
      }
      hideActionPopUps(false, () => {
        if (line !== null && point !== null) {
          setChartPopUp({
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
          });
          if (isAimRun(line.run)) {
            getCommitTags(line.run.run_hash);
          }
        } else {
          setChartFocusedState({
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
      hideActionPopUps(false);
    }
  }

  function bindInteractions() {
    svg.current.on('mousemove', function () {
      handleAreaMouseMove(d3.mouse(this));
    });

    svg.current.on('mouseleave', function () {
      handleVisAreaMouseOut(d3.mouse(this));
    });

    bgRect.current.on('click', function () {
      handleBgRectClick(d3.mouse(this));
    });
  }

  function idled() {
    idleTimeout.current = null;
  }

  function handleZoomChange() {
    const { chart } = HubMainScreenModel.getState();
    let extent = d3.event.selection;

    // If no selection, back to initial coordinate. Otherwise, update X axis domain
    if (!extent) {
      if (!idleTimeout.current) {
        return (idleTimeout.current = setTimeout(idled, 350)); // This allows to wait a little bit
      }
      setChartSettingsState({
        ...chart.settings,
        persistent: {
          ...chart.settings.persistent,
          zoom: null,
        },
      });
    } else {
      const { margin } = visBox.current;

      let left = chartOptions.current.xScale.invert(extent[0][0] - margin.left);
      let right = chartOptions.current.xScale.invert(
        extent[1][0] - margin.left,
      );

      let top = chartOptions.current.yScale.invert(extent[0][1] - margin.top);
      let bottom = chartOptions.current.yScale.invert(
        extent[1][1] - margin.top,
      );

      let [xMin, xMax] = chartOptions.current.xScale.domain();
      let [yMin, yMax] = chartOptions.current.yScale.domain();

      setChartSettingsState({
        ...chart.settings,
        zoomMode: false,
        zoomHistory: [
          [props.index, chart.settings.persistent.zoom?.[props.index] ?? null],
        ].concat(chart.settings.zoomHistory),
        persistent: {
          ...chart.settings.persistent,
          zoom: {
            ...(chart.settings.persistent.zoom ?? {}),
            [props.index]: {
              x:
                extent[1][0] - extent[0][0] < 5
                  ? null
                  : [left < xMin ? xMin : left, right > xMax ? xMax : right],
              y:
                extent[1][1] - extent[0][1] < 5
                  ? null
                  : [bottom < yMin ? yMin : bottom, top > yMax ? yMax : top],
            },
          },
        },
      });
      // This remove the grey brush area as soon as the selection has been done
      svg.current.select('.brush').call(brush.current.move, null);
    }
  }

  function handleAreaMouseMove(mouse) {
    const { chart } = HubMainScreenModel.getState();
    // Disable hover effects if circle is focused
    if (chart.focused.circle.active) {
      return false;
    }

    // Update active state
    setActiveLineAndCircle(mouse);

    // Remove hovered line state
    unsetHoveredLine(mouse);
  }

  function handleVisAreaMouseOut(mouse) {
    const { circle } = HubMainScreenModel.getState().chart.focused;
    if (!circle.active) {
      unsetHoveredLine(mouse);
    }
  }

  function handleBgRectClick(mouse) {
    const { chart } = HubMainScreenModel.getState();
    if (!chart.focused.circle.active) {
      return;
    }

    setChartFocusedState({
      circle: {
        runHash: null,
        metricName: null,
        traceContext: null,
      },
      step: null,
    });

    // Update active state
    setActiveLineAndCircle(mouse);
  }

  function handleLineClick(mouse) {
    const { chart } = HubMainScreenModel.getState();
    if (!chart.focused.circle.active) {
      return;
    }

    setChartFocusedState({
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
    setActiveLineAndCircle(mouse, false);
  }

  function handlePointClick(step, runHash, metricName, traceContext) {
    setChartFocusedActiveState({
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
    });

    setTimeout(() => {
      let activeRow = document.querySelector('.ContextBox__table__cell.active');
      if (activeRow) {
        activeRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    });
  }

  function setActiveLineAndCircle(mouse, marginInc = true) {
    const { chart } = HubMainScreenModel.getState();
    const { margin } = visBox.current;

    if (isMouseInVisArea(mouse)) {
      const data = chartOptions.current.xSteps;
      const x = marginInc ? mouse[0] - margin.left : mouse[0];
      const y = marginInc ? mouse[1] - margin.top : mouse[1];
      let step = 0;

      if (x >= 0) {
        // Line
        const xPoint = chartOptions.current.xScale.invert(x);
        const relIndex = d3.bisect(data, xPoint, 1);
        const a = data[relIndex - 1];
        const b = data[relIndex];

        step = xPoint - a > b - xPoint ? b : a;

        if (step !== chart.focused.step) {
          setChartFocusedState({
            step,
          });
        }

        // Find the nearest circle
        if (circles.current) {
          // Circles
          let nearestCircle = [];

          circles.current
            .selectAll(`.HoverCircle[data-step='${step}']`)
            .each(function () {
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
                  nearestCircleTraceContext: elem.attr(
                    'data-trace-context-hash',
                  ),
                });
              }
            });

          nearestCircle.sort((a, b) => {
            const aHash = traceToHash(
              a.nearestCircleRunHash,
              a.nearestCircleMetricName,
              a.nearestCircleTraceContext,
            );
            const bHash = traceToHash(
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
              nearestCircleRunHash !== chart.focused.metric.runHash ||
              nearestCircleMetricName !== chart.focused.metric.metricName ||
              nearestCircleTraceContext !== chart.focused.metric.traceContext
            ) {
              setChartFocusedState({
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
  }

  function unsetHoveredLine(mouse = false) {
    if (mouse === false || !isMouseInVisArea(mouse)) {
      setChartFocusedState({
        metric: {
          runHash: null,
          metricName: null,
          traceContext: null,
        },
      });
    }
  }

  function isMouseInVisArea(mouse) {
    const { width, height, margin } = visBox.current;
    const padding = 5;

    return (
      mouse[0] > margin.left - padding &&
      mouse[0] < width - margin.right + padding &&
      mouse[1] > margin.top - padding &&
      mouse[1] < height - margin.bottom + padding
    );
  }

  /* PopUp Actions */
  function positionPopUp(
    x,
    y,
    chained = null,
    popUpWidth = popUpDefaultWidth,
    popUpHeight = popUpDefaultHeight,
  ) {
    const { margin } = visBox.current;
    const { width, height } = plotBox.current;

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
  }

  function hideActionPopUps(onlySecondary = false, callback = null) {
    setTagPopUp((tp) => ({
      ...tp,
      display: false,
    }));
    setCommitPopUp((cp) => ({
      ...cp,
      display: false,
    }));
    if (!onlySecondary) {
      setChartPopUp((cp) => ({
        ...cp,
        display: false,
      }));
    }

    if (callback) {
      callback();
    }
  }

  function getCommitTags(runHash) {
    props
      .getCommitTags(runHash)
      .then((data) => {
        setChartPopUp((cp) => ({
          ...cp,
          selectedTags: data,
        }));
      })
      .catch(() => {
        setChartPopUp((cp) => ({
          ...cp,
          selectedTags: [],
        }));
      })
      .finally(() => {
        setChartPopUp((cp) => ({
          ...cp,
          selectedTagsLoading: false,
        }));
      });
  }

  function handleTagItemClick(runHash, experimentName, tag) {
    setChartPopUp((cp) => ({
      ...cp,
      selectedTagsLoading: true,
    }));

    props
      .updateCommitTag({
        commit_hash: runHash,
        tag_id: tag.id,
        experiment_name: experimentName,
      })
      .then((tagsIds) => {
        getCommitTags(runHash);
      });
  }

  function handleAttachTagClick() {
    const pos = positionPopUp(
      chartPopUp.left + popUpDefaultWidth,
      chartPopUp.top,
      chartPopUp,
    );

    setTagPopUp((tp) => ({
      ...tp,
      ...pos,
      display: true,
      isLoading: true,
    }));

    hideActionPopUps(true, () => {
      props.getTags().then((data) => {
        setTagPopUp((tp) => ({
          ...tp,
          display: true,
          tags: data,
          isLoading: false,
        }));
      });
    });
  }

  function handleProcessKill(pid, runHash, experimentName) {
    setCommitPopUp((cp) => ({
      ...cp,
      processKillBtn: {
        loading: true,
        disabled: true,
      },
    }));

    props.killRunningExecutable(pid).then((data) => {
      handleCommitInfoClick(runHash, experimentName);
    });
  }

  function handleCommitInfoClick(runHash, experimentName) {
    const pos = positionPopUp(
      chartPopUp.left + popUpDefaultWidth,
      chartPopUp.top,
      chartPopUp,
    );

    hideActionPopUps(true, () => {
      setCommitPopUp((cp) => ({
        ...cp,
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
      }));

      props.getCommitInfo(experimentName, runHash).then((data) => {
        setCommitPopUp((cp) => ({
          ...cp,
          isLoading: false,
          data,
        }));
      });
    });
  }

  function _renderPopUpContent() {
    const { traceList, contextFilter } = HubMainScreenModel.getState();
    const { run, metric, trace, point } = chartPopUp;
    const commitPopUpData = commitPopUp.data;

    // FIXME: improve checking of containing current run
    return contextFilter.groupByChart.length === 0 ||
      traceList?.traces
        .filter((trace) => trace.chart === props.index)
        .some((traceModel) =>
          traceModel.hasRun(
            run?.run_hash,
            metric?.name,
            contextToHash(trace?.context),
          ),
        ) ? (
        <div className='PanelChart__body'>
          {chartPopUp.display && (
            <PopUp
              className='ChartPopUp'
              left={chartPopUp.left}
              top={chartPopUp.top}
              width={chartPopUp.width}
              height={chartPopUp.height}
              xGap={true}
            >
              <div>
                {isAimRun(run) && (
                  <div>
                    {!chartPopUp.selectedTagsLoading ? (
                      <div className='PanelChart__popup__tags__wrapper'>
                        <UI.Text overline type='grey-darker'>
                        tag
                        </UI.Text>
                        <div className='PanelChart__popup__tags'>
                          {chartPopUp.selectedTags.length ? (
                          <>
                            {chartPopUp.selectedTags.map((tagItem, i) => (
                              <UI.Label key={i} color={tagItem.color}>
                                {tagItem.name}
                              </UI.Label>
                            ))}
                          </>
                          ) : (
                            <UI.Label>No attached tag</UI.Label>
                          )}
                          <div
                            className='PanelChart__popup__tags__update'
                            onClick={handleAttachTagClick}
                          >
                            <UI.Icon i='edit' />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <UI.Text type='grey' center spacingTop spacing>
                      Loading..
                      </UI.Text>
                    )}
                    <UI.Line />
                  </div>
                )}
                <UI.Text type='grey-dark'>
                  <span>Value: {Math.round(point[0] * 10e9) / 10e9}</span>
                </UI.Text>
                {point[2] !== null && (
                  <UI.Text type='grey' small>
                  Epoch: {point[2]}
                  </UI.Text>
                )}
                <UI.Text type='grey' small>
                Step: {point[1]}
                  {isTFSummaryScalar(run) && <> (local step: {point[4]}) </>}
                </UI.Text>
                {isAimRun(run) && (
                <>
                  <UI.Line />
                  <Link
                    to={buildUrl(HUB_PROJECT_EXPERIMENT, {
                      experiment_name: run.experiment_name,
                      commit_id: run.run_hash,
                    })}
                  >
                    <UI.Text type='primary'>Run Details</UI.Text>
                  </Link>
                  <UI.Text type='grey' small>
                    Experiment: {run.experiment_name}
                  </UI.Text>
                  <UI.Text type='grey' small>
                    Hash: {run.run_hash}
                  </UI.Text>
                </>
                )}
                {isTFSummaryScalar(run) && (
                <>
                  <div className='PanelChart__popup__tags__wrapper'>
                    <UI.Text overline type='grey-darker'>
                      tag
                    </UI.Text>
                    <div className='PanelChart__popup__tags'>
                      <UI.Label>{metric.tag.name}</UI.Label>
                    </div>
                  </div>
                  <UI.Line />
                  <UI.Text overline type='grey-darker'>
                    tf.summary scalar
                  </UI.Text>
                  <UI.Text type='grey-dark'>{run.name}</UI.Text>
                  {/*<UI.Text type='grey' small>{moment.unix(run.date).format('HH:mm · D MMM, YY')}</UI.Text>*/}
                  <UI.Line />
                </>
                )}
              </div>
            </PopUp>
          )}
          {tagPopUp.display && (
            <PopUp
              className='TagPopUp'
              left={tagPopUp.left}
              top={tagPopUp.top}
              chainArrow={tagPopUp.chainArrow}
              xGap={true}
            >
              {tagPopUp.isLoading ? (
                <UI.Text type='grey' center>
                Loading..
                </UI.Text>
              ) : (
                <div className='TagPopUp__tags'>
                  <div className='TagPopUp__tags__title'>
                    <UI.Text type='grey' inline>
                    Select a tag
                    </UI.Text>
                    <Link to={HUB_PROJECT_CREATE_TAG}>
                      <UI.Button type='positive' size='tiny'>
                      Create
                      </UI.Button>
                    </Link>
                  </div>
                  <UI.Line spacing={false} />
                  <div className='TagPopUp__tags__box'>
                    {!tagPopUp.tags.length && (
                      <UI.Text type='grey' center spacingTop spacing>
                      Empty
                      </UI.Text>
                    )}
                    {tagPopUp.tags.map((tag, tagKey) => (
                      <UI.Label
                        className={classNames({
                          TagPopUp__tags__item: true,
                          active: chartPopUp.selectedTags
                            .map((i) => i.id)
                            .includes(tag.id),
                        })}
                        key={tagKey}
                        color={tag.color}
                        onClick={() =>
                          handleTagItemClick(
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
          {commitPopUp.display && (
            <PopUp
              className='CommitPopUp'
              left={commitPopUp.left}
              top={commitPopUp.top}
              chainArrow={commitPopUp.chainArrow}
              xGap={true}
            >
              {ommitPopUp.isLoading ? (
                <UI.Text type='grey' center>
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
                  <UI.Text type='primary'>Detailed View</UI.Text>
                </Link>
                <UI.Line />
                <UI.Text type='grey' small>
                  Experiment: {run.experiment_name}
                </UI.Text>
                <UI.Text type='grey' small>
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
                    <UI.Text type='grey' small>
                      Process status:{' '}
                      {commitPopUpData.process.finish ? 'finished' : 'running'}
                    </UI.Text>
                    {!!commitPopUpData.process.start_date && (
                      <UI.Text type='grey' small>
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
                      <div className='CommitPopUp__process'>
                        <UI.Text type='grey' small inline>
                          PID: {commitPopUpData.process.pid}{' '}
                        </UI.Text>
                        <UI.Button
                          onClick={() =>
                            handleProcessKill(
                              commitPopUpData.process.pid,
                              run.run_hash,
                              run.experiment_name,
                            )
                          }
                          type='negative'
                          size='tiny'
                          inline
                          {...commitPopUp.processKillBtn}
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
  }

  useEffect(() => {
    initD3();
    const animatedRender = () => window.requestAnimationFrame(renderChart);
    window.addEventListener('resize', animatedRender);
    const rerenderSubscription = HubMainScreenModel.subscribe(
      [
        HubMainScreenModel.events.SET_TRACE_LIST,
        HubMainScreenModel.events.SET_CHART_SETTINGS_STATE,
        HubMainScreenModel.events.SET_CHART_FOCUSED_ACTIVE_STATE,
      ],
      animatedRender,
    );
    const updateSubscription = HubMainScreenModel.subscribe(
      HubMainScreenModel.events.SET_CHART_FOCUSED_STATE,
      () => {
        window.requestAnimationFrame(() => {
          lines.current?.selectAll('path').remove();
          attributes.current?.selectAll('g').remove();
          attributes.current?.selectAll('line').remove();
          drawData();
        });
      },
    );

    return () => {
      rerenderSubscription.unsubscribe();
      updateSubscription.unsubscribe();
      window.removeEventListener('resize', animatedRender);
    };
  }, []);

  useEffect(() => {
    window.requestAnimationFrame(renderChart);
    return () => {
      window.cancelAnimationFrame(renderChart);
    };
  }, [props.width, props.height]);

  const styles = {};

  if (props.width !== null) {
    styles.width = props.width;
  }
  if (props.height !== null) {
    styles.height = props.height;
  }

  return (
    <div className='PanelChart' ref={parentRef} style={styles}>
      <div ref={visRef} className='PanelChart__svg' />
      {_renderPopUpContent()}
    </div>
  );
}

PanelChart.defaultProps = {
  index: 0,
  width: null,
  height: null,
  ratio: null,
};

PanelChart.propTypes = {
  index: PropTypes.number,
  width: PropTypes.number,
  height: PropTypes.number,
  ratio: PropTypes.number,
};

export default React.memo(
  storeUtils.getWithState(classes.PANEL_CHART, PanelChart),
);
