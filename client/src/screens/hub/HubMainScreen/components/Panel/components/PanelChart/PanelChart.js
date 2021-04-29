import './PanelChart.less';

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Color from 'color';
import * as _ from 'lodash';
import * as moment from 'moment';
import humanizeDuration from 'humanize-duration';

import { removeOutliers, formatValue } from '../../../../../../../utils';
import { HubMainScreenModel } from '../../../../models/HubMainScreenModel';

const d3 = require('d3');

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

const scaleOptions = ['linear', 'log'];

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
  largest: 1,
});

function PanelChart(props) {
  let visBox = useRef({
    margin: {
      top: 24,
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
    getClosestStepData,
  } = HubMainScreenModel.helpers;

  const parentRef = useRef();
  const visRef = useRef();
  const svg = useRef(null);
  const plot = useRef(null);
  const bgRect = useRef(null);
  const axes = useRef(null);
  const lines = useRef(null);
  const circles = useRef(null);
  const attributes = useRef(null);
  const brush = useRef(null);
  const idleTimeout = useRef(null);
  const xAxisValue = useRef();
  const yAxisValue = useRef();
  const humanizerConfig = useRef();

  function getValueInLine({ x1, x2, y1, y2, x, y, scale }) {
    if (x === undefined) {
      let value;
      let dx1;
      let dx2;
      let dy1;
      let dy2;
      if (x1 === x2) {
        value = x1;
      } else {
        if (scale.xScale === 0) {
          dx1 = x1;
          dx2 = x2;
        } else {
          dx1 = Math.log(x1);
          dx2 = Math.log(x2);
        }
        if (scale.yScale === 0) {
          dy1 = y - y1;
          dy2 = y2 - y1;
        } else {
          dy1 = Math.log(y) - Math.log(y1);
          dy2 = Math.log(y2) - Math.log(y1);
        }
        if (dx1 > dx2) {
          value = dx1 - ((dx1 - dx2) * dy1) / dy2;
        } else {
          value = ((dx2 - dx1) * dy1) / dy2 + dx1;
        }
        if (scale.xScale === 1) {
          value = Math.exp(value);
        }
      }
      return value;
    } else {
      let value;
      let dx1;
      let dx2;
      let dy1;
      let dy2;
      if (x1 === x2 || x === x1) {
        value = y1;
      } else if (x === x2) {
        value = y2;
      } else {
        if (scale.xScale === 0) {
          dx1 = x - x1;
          dx2 = x2 - x1;
        } else {
          dx1 = Math.log(x) - Math.log(x1);
          dx2 = Math.log(x2) - Math.log(x1);
        }
        if (scale.yScale === 0) {
          dy1 = y1;
          dy2 = y2;
        } else {
          dy1 = Math.log(y1);
          dy2 = Math.log(y2);
        }
        if (dy1 > dy2) {
          value = dy1 - ((dy1 - dy2) * dx1) / dx2;
        } else {
          value = ((dy2 - dy1) * dx1) / dx2 + dy1;
        }
        if (scale.yScale === 1) {
          value = Math.exp(value);
        }
      }
      return value;
    }
  }

  function calculateLineValues({
    axisValues,
    traceData,
    xMin,
    xMax,
    yMin,
    yMax,
    scale,
  }) {
    let prevValue = {};
    const xMinScaled = chartOptions.current.xScale(xMin);
    const xMaxScaled = chartOptions.current.xScale(xMax);
    const yMinScaled = chartOptions.current.yScale(yMin);
    const yMaxScaled = chartOptions.current.yScale(yMax);
    const offsetScaled = 50;
    const minEdge = chartOptions.current.yScale.invert(
      yMinScaled + offsetScaled,
    );
    const maxEdge = chartOptions.current.yScale.invert(
      yMaxScaled - offsetScaled,
    );
    let leftEdge = _.findLastIndex(axisValues, (v) => v <= xMin);
    let rightEdge = _.findIndex(axisValues, (v) => v >= xMax) + 1;
    if (leftEdge === -1) {
      leftEdge = 0;
    }
    if (rightEdge === 0) {
      rightEdge = axisValues.length;
    }
    let visibleAxisValues = axisValues.slice(leftEdge, rightEdge);
    let visibleTraceData = traceData.slice(leftEdge, rightEdge);

    let lineData = visibleAxisValues.map((xValue, i) => {
      let yValue = visibleTraceData[i][0];
      let x;
      let y = yValue < minEdge ? minEdge : yValue > maxEdge ? maxEdge : yValue;
      let value;
      if (y === yValue) {
        x = xValue;
        prevValue = { x, y };
        value = { x, y };
      } else {
        const nextX = visibleAxisValues[i + 1];
        const nextYValue = visibleTraceData[i + 1]?.[0];
        let nextY =
          nextYValue < minEdge
            ? minEdge
            : nextYValue > maxEdge
              ? maxEdge
              : nextYValue;
        if (i === 0) {
          x = xValue;
          if (visibleAxisValues.length > 1) {
            let x2 = getValueInLine({
              x1: x,
              x2: nextX,
              y1: yValue,
              y2: nextY,
              y: y,
              scale,
            });
            value = [
              { x, y },
              { x: x2, y },
            ];
            prevValue = {
              x: x2,
              y,
            };
          } else {
            prevValue = { x, y };
            value = { x, y };
          }
        } else {
          x = getValueInLine({
            x1: prevValue.x,
            x2: xValue,
            y1: prevValue.y,
            y2: yValue,
            y: y,
            scale,
          });
          if (i !== visibleAxisValues.length - 1) {
            let x2 = getValueInLine({
              x1: xValue,
              x2: nextX,
              y1: yValue,
              y2: nextY,
              y: y,
              scale,
            });
            value = [
              { x, y },
              { x: x2, y },
            ];
            prevValue = {
              x: x2,
              y,
            };
          } else {
            value = { x, y };
          }
        }
      }

      return Array.isArray(value)
        ? value.map((v) => ({
          x: chartOptions.current.xScale(v.x),
          y: chartOptions.current.yScale(v.y),
        }))
        : {
          x: chartOptions.current.xScale(value.x),
          y: chartOptions.current.yScale(value.y),
        };
    });
    let result = lineData.flat().sort((a, b) => a.x - b.x);
    let minIndex = -1;
    let maxIndex = result.length;

    for (let i = 0; i < result.length; i++) {
      const d = result[i];
      if (d.x < xMinScaled && i > minIndex) {
        minIndex = i;
      }
      if (d.x > xMaxScaled && i < maxIndex) {
        maxIndex = i;
      }
    }

    if (minIndex >= maxIndex) {
      result = [];
    } else {
      if (minIndex > -1 && minIndex < result.length - 1) {
        result[minIndex] = {
          x: xMinScaled,
          y: chartOptions.current.yScale(
            getValueInLine({
              x1: chartOptions.current.xScale.invert(result[minIndex].x),
              x2: chartOptions.current.xScale.invert(result[minIndex + 1].x),
              y1: chartOptions.current.yScale.invert(result[minIndex].y),
              y2: chartOptions.current.yScale.invert(result[minIndex + 1].y),
              x: xMin,
              scale,
            }),
          ),
        };
      }
      if (maxIndex < result.length && maxIndex > 0) {
        result[maxIndex] = {
          x: xMaxScaled,
          y: chartOptions.current.yScale(
            getValueInLine({
              x1: chartOptions.current.xScale.invert(result[maxIndex - 1].x),
              x2: chartOptions.current.xScale.invert(result[maxIndex].x),
              y1: chartOptions.current.yScale.invert(result[maxIndex - 1].y),
              y2: chartOptions.current.yScale.invert(result[maxIndex].y),
              x: xMax,
              scale,
            }),
          ),
        };
      }
    }

    return result.slice(minIndex > -1 ? minIndex : 0, maxIndex + 1);
  }

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
    const { chart } = HubMainScreenModel.getState();
    if (chart.settings.persistent.aggregated) {
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

    const isXLogScale =
      scaleOptions[chart.settings.persistent.xScale] === 'log';

    visBox.current = {
      ...visBox.current,
      width,
      height,
    };
    plotBox.current = {
      ...plotBox.current,
      width: width - margin.left - margin.right,
      height: height - margin.top - (margin.bottom + (isXLogScale ? 5 : 0)),
    };

    visArea.style('width', `${width}px`).style('height', `${height}px`);

    svg.current = visArea
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('xmlns', 'http://www.w3.org/2000/svg'); // .attr('id', 'panel_svg');

    const titleMarginTop = 5;
    const titleMarginBottom = 2;
    const titleHeight = margin.top - titleMarginTop - titleMarginBottom;
    const isZoomed = !!chart.settings.persistent.zoom?.[props.index];

    if (traceList?.grouping.chart) {
      svg.current
        .append('foreignObject')
        .attr('x', 0)
        .attr('y', titleMarginTop)
        .attr('height', titleHeight)
        .attr('width', width - (isZoomed ? titleHeight : 0))
        .html((d) => {
          const title =
            traceList?.grouping.chart.length > 0
              ? `${traceList?.grouping.chart
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
              : '';
          const index = props.index + 1;

          if (!traceList?.grouping.chart.length) {
            return '';
          }

          return `
            <div class='ChartTitle' title='#${index} ${title}'>
              <div style='width: ${titleHeight}px; height: ${titleHeight}px;' class='ChartTitle__index'>${index}</div>
              <div class='ChartTitle__text'>${title}</div>
            </div>`;
        })
        .moveToFront();
    }

    if (isZoomed) {
      function zoomOut() {
        let historyIndex = _.findIndex(
          chart.settings.zoomHistory,
          (item) => item[0] === +props.index,
        );
        setChartSettingsState({
          ...chart.settings,
          zoomMode: false,
          zoomHistory: chart.settings.zoomHistory.filter(
            (item, index) => index !== historyIndex,
          ),
          persistent: {
            ...chart.settings.persistent,
            zoom: {
              ...(chart.settings.persistent.zoom ?? {}),
              [props.index]:
                chart.settings.zoomHistory[historyIndex]?.[1] ?? null,
            },
          },
        });
      }
      svg.current
        .append('foreignObject')
        .attr('x', width - 30)
        .attr('y', titleMarginTop)
        .attr('height', titleHeight)
        .attr('width', titleHeight)
        .html((d) => {
          return `
            <div 
              class='ChartTitle ChartTitle--zoom' 
              style='width: ${titleHeight}px; height: ${titleHeight}px;' 
              title='Click to zoom out'
            >
              <span class='Icon zoom_out material-icons-outlined no_spacing_right'>
                zoom_out
              </span>
            </>`;
        })
        .on('click', zoomOut)
        .moveToFront();
    }

    bgRect.current = svg.current
      .append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', width - margin.left - margin.right)
      .attr(
        'height',
        height - margin.top - (margin.bottom + (isXLogScale ? 5 : 0)),
      )
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
      .attr(
        'height',
        height - margin.top - (margin.bottom + (isXLogScale ? 5 : 0)),
      );

    attributes.current = plot.current.append('g');
    attributes.current
      .append('clipPath')
      .attr('id', 'circles-rect-clip-' + props.index)
      .append('rect')
      .attr('x', -7)
      .attr('y', 0)
      .attr('width', width - margin.left - margin.right + 14)
      .attr(
        'height',
        height - margin.top - (margin.bottom + (isXLogScale ? 5 : 0)),
      );

    if (chart.settings.zoomMode) {
      brush.current = d3
        .brush()
        .extent([
          [margin.left, margin.top],
          [
            width - margin.right,
            height - (margin.bottom + (isXLogScale ? 5 : 0)),
          ],
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
        let min = trace.axisValues[0];
        if (
          scaleOptions[chart.settings.persistent.xScale] === 'log' &&
          min === 0
        ) {
          min = trace.axisValues[1] ?? min;
        }
        if (max > xMax) {
          xMax = max;
        }
        if (min < xMin) {
          if (scaleOptions[chart.settings.persistent.xScale] === 'log') {
            xMin = min === 0 ? 1 : min;
          } else {
            xMin = min;
          }
        }

        xSteps = _.uniq(xSteps.concat(trace.axisValues).sort((a, b) => a - b));
        xNum = xSteps.length;
      });
    });

    let xScaleBase;
    if (scaleOptions[chart.settings.persistent.xScale || 0] === 'linear') {
      xScaleBase = d3.scaleLinear();
    } else if (scaleOptions[chart.settings.persistent.xScale] === 'log') {
      xScaleBase = d3.scaleLog();
    }

    const xScale = xScaleBase
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
          let traceValues =
            trace && trace.data.map((elem) => elem[0]).sort((a, b) => a - b);
          if (scaleOptions[chart.settings.persistent.yScale] === 'log') {
            traceValues = traceValues?.filter((v) => v > 0);
          }
          const traceMax = traceValues?.[traceValues?.length - 1];
          const traceMin = traceValues?.[0];

          if ((yMax === null && traceMax !== undefined) || traceMax > yMax) {
            yMax = traceMax;
          }
          if ((yMin === null && traceMin !== undefined) || traceMin < yMin) {
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
              if (
                scaleOptions[chart.settings.persistent.yScale] !== 'log' ||
                elem[0] > 0
              ) {
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
      if (
        scaleOptions[chart.settings.persistent.yScale] === 'log' &&
        yMin === 0
      ) {
        yMin = minData[1];
      }
      yMax = maxData[maxData.length - 1];
    }

    let yScaleBase;
    if (scaleOptions[chart.settings.persistent.yScale || 0] === 'linear') {
      if (yMax === yMin) {
        yMax += 1;
        yMin -= 1;
      } else {
        const diff = yMax - yMin;
        yMax += diff * 0.1;
        yMin -= diff * 0.05;
      }
      yScaleBase = d3.scaleLinear();
    } else if (scaleOptions[chart.settings.persistent.yScale] === 'log') {
      if (yMin === 0) {
        yMin = 0.1;
      }
      yScaleBase = d3.scaleLog();
    }

    const isXLogScale =
      scaleOptions[chart.settings.persistent.xScale] === 'log';

    const yScale = yScaleBase
      .domain(chart.settings.persistent.zoom?.[props.index]?.y ?? [yMin, yMax])
      .range([
        height - margin.top - (margin.bottom + (isXLogScale ? 5 : 0)),
        0,
      ]);

    let xAxisTicks = d3.axisBottom(xScale);

    if (xAlignment === 'epoch') {
      const ticksCount = Math.floor(plotBox.current.width / 50);
      const delta = Math.floor(xTicks.length / ticksCount);
      const ticks =
        delta > 1 ? xTicks.filter((_, i) => i % delta === 0) : xTicks;
      xAxisTicks
        .tickValues(ticks.map((tick) => tick[0]))
        .tickFormat((d, i) => ticks[i][1]);
    } else if (xAlignment === 'relative_time') {
      let ticksCount = Math.floor(plotBox.current.width / 85);
      ticksCount = ticksCount > 1 ? ticksCount - 1 : 1;
      const minute = 60;
      const hour = 60 * minute;
      const day = 24 * hour;
      const week = 7 * day;
      const [first, last] = xScale.domain();
      const diff = Math.ceil(last - first);
      let unit;
      let formatUnit;
      if (diff / week > 4) {
        unit = week;
        formatUnit = 'w';
      } else if (diff / day > 3) {
        unit = day;
        formatUnit = 'd';
      } else if (diff / hour > 3) {
        unit = hour;
        formatUnit = 'h';
      } else if (diff / minute > 4) {
        unit = minute;
        formatUnit = 'm';
      } else {
        unit = null;
        formatUnit = 's';
      }
      let tickValues =
        unit === null
          ? null
          : _.range(Math.ceil(first), Math.ceil(last) + 1).filter(
            (t) => t % unit === 0,
          );
      if (unit !== null && ticksCount < tickValues.length) {
        tickValues = tickValues.filter((v, i) => {
          if (i === 0 || i === tickValues.length - 1) {
            return true;
          }
          const interval = Math.floor(
            (tickValues.length - 2) / (ticksCount - 2),
          );
          return i % interval === 0 && tickValues.length - interval > i;
        });
      }

      humanizerConfig.current = {
        units: [formatUnit],
      };

      xAxisTicks
        .ticks(ticksCount)
        .tickValues(tickValues)
        .tickFormat((d, i) =>
          shortEnglishHumanizer(Math.round(+d * 1000), humanizerConfig.current),
        );
    } else if (xAlignment === 'absolute_time') {
      let ticksCount = Math.floor(plotBox.current.width / 120);
      ticksCount = ticksCount > 1 ? ticksCount - 1 : 1;
      const tickValues = _.range(...xScale.domain());

      xAxisTicks
        .ticks(ticksCount > 1 ? ticksCount - 1 : 1)
        .tickValues(
          tickValues.filter((v, i) => {
            if (i === 0 || i === tickValues.length - 1) {
              return true;
            }
            const interval = Math.floor(
              (tickValues.length - 2) / (ticksCount - 2),
            );
            return i % interval === 0 && tickValues.length - interval > i;
          }),
        )
        .tickFormat((d, i) => moment.unix(d).format('HH:mm:ss D MMM, YY'));
    }

    const xAxis = axes.current
      .append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${plotBox.current.height})`)
      .call(xAxisTicks);

    const initialTicks = axes.current.selectAll('.tick');
    const ticksPositions = [];
    initialTicks.each((data) => {
      ticksPositions.push(xScale(data));
    });

    for (let i = ticksPositions.length - 1; i > 0; i--) {
      let currentTickPos = ticksPositions[i];
      let prevTickPos = ticksPositions[i - 1];
      if (currentTickPos - prevTickPos < 10) {
        xAxis.select(`.tick:nth-of-type(${i})`).attr('hidden', true);
      }
    }

    if (isXLogScale) {
      xAxis
        .selectAll('text')
        .style('text-anchor', 'middle')
        .attr('dx', '-0.7em')
        .attr('dy', '0.7em')
        .attr(
          'transform',
          `rotate(${xAlignment === 'absolute_time' ? -10 : -40})`,
        );
    }

    svg.current
      .append('text')
      .attr(
        'transform',
        `translate(
        ${visBox.current.width - 20},
        ${
          visBox.current.height -
          (visBox.current.margin.bottom + (isXLogScale ? 5 : 0)) -
          5
        }
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

    plot.current.moveToFront();

    const yAxisTicks = d3.axisLeft(yScale);
    const ticksCount = Math.floor(plotBox.current.height / 20);
    yAxisTicks.ticks(ticksCount > 3 ? (ticksCount < 20 ? ticksCount : 20) : 3);

    axes.current.append('g').attr('class', 'y axis').call(yAxisTicks);

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
          runIndex++;
          return;
        }
        const { run, metric, trace } = series;

        if (run.metricIsHidden) {
          runIndex++;
          return;
        }

        const traceData = [];
        const axisValues = trace.axisValues.filter((xVal, i) => {
          const isXLogScale =
            scaleOptions[chart.settings.persistent.xScale] === 'log';
          const isYLogScale =
            scaleOptions[chart.settings.persistent.yScale] === 'log';
          if (
            (isXLogScale && xVal <= 0) ||
            (isYLogScale && trace?.data[i]?.[0] <= 0)
          ) {
            return false;
          }
          if (!!trace?.data) {
            traceData.push(trace?.data[i]);
          }
          return true;
        });

        const lineData = calculateLineValues({
          axisValues: axisValues,
          traceData: traceData,
          xMin: chartOptions.current.xScale.domain()[0],
          xMax: chartOptions.current.xScale.domain()[1],
          yMin: chartOptions.current.yScale.domain()[0],
          yMax: chartOptions.current.yScale.domain()[1],
          scale: {
            xScale: chart.settings.persistent.xScale,
            yScale: chart.settings.persistent.yScale,
          },
        });

        const line = d3
          .line()
          .x((d) => d.x)
          .y((d) => d.y)
          .curve(
            d3[
              curveOptions[
                chart.settings.persistent.interpolate &&
                !chart.settings.persistent.aggregated
                  ? 5
                  : 0
              ]
            ],
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
          .datum(lineData)
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
    const { traceList, chart, contextFilter } = HubMainScreenModel.getState();
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

      let areaTraceMin;
      let areaTraceMax;
      let lineTrace;

      switch (contextFilter.aggregatedArea) {
        case 'min_max':
          areaTraceMin = traceModel.aggregation.min;
          areaTraceMax = traceModel.aggregation.max;
          break;
        case 'std_dev':
          areaTraceMin = traceModel.aggregation.stdDevMin;
          areaTraceMax = traceModel.aggregation.stdDevMax;
          break;
        case 'std_err':
          areaTraceMin = traceModel.aggregation.stdErrMin;
          areaTraceMax = traceModel.aggregation.stdErrMax;
          break;
      }

      switch (contextFilter.aggregatedLine) {
        case 'avg':
          lineTrace = traceModel.aggregation.avg;
          break;
        case 'median':
          lineTrace = traceModel.aggregation.med;
          break;
        case 'min':
          lineTrace = traceModel.aggregation.min;
          break;
        case 'max':
          lineTrace = traceModel.aggregation.max;
          break;
      }

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

      if (
        contextFilter.aggregatedArea !== 'none' &&
        !!areaTraceMin &&
        !!areaTraceMax
      ) {
        let traceMinData;
        let traceMaxData;
        traceMinData = areaTraceMin?.trace.data.filter(
          (point) =>
            !Number.isNaN(chartOptions.current.xScale(point[1])) &&
            !Number.isNaN(chartOptions.current.yScale(point[0])),
        );
        traceMaxData = areaTraceMax?.trace.data.filter(
          (point) =>
            !Number.isNaN(chartOptions.current.xScale(point[1])) &&
            !Number.isNaN(chartOptions.current.yScale(point[0])),
        );

        const minLineData = calculateLineValues({
          axisValues: traceMinData.map((d) => d[1]),
          traceData: traceMinData,
          xMin: chartOptions.current.xScale.domain()[0],
          xMax: chartOptions.current.xScale.domain()[1],
          yMin: chartOptions.current.yScale.domain()[0],
          yMax: chartOptions.current.yScale.domain()[1],
          scale: {
            xScale: chart.settings.persistent.xScale,
            yScale: chart.settings.persistent.yScale,
          },
        });

        const maxLineData = calculateLineValues({
          axisValues: traceMaxData.map((d) => d[1]),
          traceData: traceMaxData,
          xMin: chartOptions.current.xScale.domain()[0],
          xMax: chartOptions.current.xScale.domain()[1],
          yMin: chartOptions.current.yScale.domain()[0],
          yMax: chartOptions.current.yScale.domain()[1],
          scale: {
            xScale: chart.settings.persistent.xScale,
            yScale: chart.settings.persistent.yScale,
          },
        });

        const areaMinMax = [];
        const len = Math.max(minLineData.length, maxLineData.length);

        for (let i = 0; i < len; i++) {
          areaMinMax.push({
            min: minLineData[i] ?? minLineData[minLineData.length - 1],
            max: maxLineData[i] ?? maxLineData[maxLineData.length - 1],
          });
        }

        const area = d3
          .area()
          .x0((d) => d.max.x)
          .x1((d) => d.min.x)
          .y0((d) => d.max.y)
          .y1((d) => d.min.y)
          .curve(d3[curveOptions[0]]);

        lines.current
          .append('path')
          .attr(
            'class',
            `PlotArea ${noSelectedRun ? '' : 'inactive'} ${
              active ? 'active' : ''
            }`,
          )
          .datum(areaMinMax)
          .attr('d', area)
          .attr('clip-path', 'url(#lines-rect-clip-' + props.index + ')')
          .attr(
            'fill',
            Color(
              traceList?.grouping?.color?.length > 0
                ? traceModel.color
                : getMetricColor(
                  lineTrace.run,
                  lineTrace.metric,
                    lineTrace?.trace,
                ),
            )
              .alpha(0.3)
              .hsl()
              .string(),
          )
          .on('click', function () {
            handleLineClick(d3.mouse(this));
          });
      }

      const lineTraceData = lineTrace?.trace?.data.filter(
        (point) => !Number.isNaN(chartOptions.current.xScale(point[1])),
      );

      if (!!lineTraceData) {
        const aggLineTraceData = calculateLineValues({
          axisValues: lineTraceData.map((d) => d[1]),
          traceData: lineTraceData,
          xMin: chartOptions.current.xScale.domain()[0],
          xMax: chartOptions.current.xScale.domain()[1],
          yMin: chartOptions.current.yScale.domain()[0],
          yMax: chartOptions.current.yScale.domain()[1],
          scale: {
            xScale: chart.settings.persistent.xScale,
            yScale: chart.settings.persistent.yScale,
          },
        });
        const aggLineFunc = d3
          .line()
          .x((d) => d.x)
          .y((d) => d.y)
          .curve(d3[curveOptions[0]]);
        lines.current
          .append('path')
          .attr(
            'class',
            `PlotLine PlotLine-${traceToHash(
              lineTrace.run.run_hash,
              lineTrace.metric.name,
              lineTrace.trace.context,
            )} active`,
          )
          .datum(aggLineTraceData)
          .attr('d', aggLineFunc)
          .attr('clip-path', 'url(#lines-rect-clip-' + props.index + ')')
          .style('fill', 'none')
          .style(
            'stroke',
            traceList?.grouping?.color?.length > 0
              ? traceModel.color
              : getMetricColor(
                lineTrace.run,
                lineTrace.metric,
                lineTrace.trace,
              ),
          )
          .style(
            'stroke-dasharray',
            traceList?.grouping?.stroke?.length > 0 ? traceModel.stroke : '0',
          )
          .attr('data-run-hash', lineTrace.run.run_hash)
          .attr('data-metric-name', lineTrace.metric.name)
          .attr(
            'data-trace-context-hash',
            contextToHash(lineTrace.trace.context),
          )
          .on('click', function () {
            handleLineClick(d3.mouse(this));
          });
      }

      if (!noSelectedRun) {
        let runIndex = 0;
        traceList?.traces.forEach((traceModel) => {
          traceModel.series.forEach((series) => {
            if (traceModel.chart !== props.index) {
              runIndex++;
              return;
            }
            const { run, metric, trace } = series;

            if (run.metricIsHidden) {
              runIndex++;
              return;
            }

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
              runIndex++;
              return;
            }
            const traceData = [];
            const axisValues = trace.axisValues.filter((xVal, i) => {
              const isXLogScale =
                scaleOptions[chart.settings.persistent.xScale] === 'log';
              const isYLogScale =
                scaleOptions[chart.settings.persistent.yScale] === 'log';
              if (
                (isXLogScale && xVal <= 0) ||
                (isYLogScale && trace?.data[i]?.[0] <= 0)
              ) {
                return false;
              }
              if (!!trace?.data) {
                traceData.push(trace.data[i]);
              }
              return true;
            });

            const lineData = calculateLineValues({
              axisValues: axisValues,
              traceData: traceData,
              xMin: chartOptions.current.xScale.domain()[0],
              xMax: chartOptions.current.xScale.domain()[1],
              yMin: chartOptions.current.yScale.domain()[0],
              yMax: chartOptions.current.yScale.domain()[1],
              scale: {
                xScale: chart.settings.persistent.xScale,
                yScale: chart.settings.persistent.yScale,
              },
            });
            const focusedLine = d3
              .line()
              .x((d) => d.x)
              .y((d) => d.y)
              .curve(
                d3[
                  curveOptions[
                    chart.settings.persistent.interpolate &&
                    !chart.settings.persistent.aggregated
                      ? 5
                      : 0
                  ]
                ],
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
              .datum(lineData)
              .attr('d', focusedLine)
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
                traceList?.grouping?.stroke?.length > 0
                  ? traceModel.stroke
                  : '0',
              )
              .attr('data-run-hash', run.run_hash)
              .attr('data-metric-name', metric?.name)
              .attr('data-trace-context-hash', traceContext)
              .on('click', function () {
                handleLineClick(d3.mouse(this));
              });
            runIndex++;
          });
        });
      }
    });
  }

  function drawHoverAttributes() {
    const { chart, traceList, contextFilter } = HubMainScreenModel.getState();
    const highlightMode = chart.settings.highlightMode;
    const focused = chart.focused;
    let step = focused.circle.active ? focused.circle.step : focused.step;
    if (step === null || step === undefined) {
      return;
    }

    let x = chartOptions.current.xScale(step);

    const { height, width } = plotBox.current;
    const isXLogScale =
      scaleOptions[chart.settings.persistent.xScale] === 'log';
    const isYLogScale =
      scaleOptions[chart.settings.persistent.yScale] === 'log';

    const visArea = d3.select(visRef.current);

    if (!isXLogScale || step > 0) {
      // Draw vertical hover line
      const [xMin, xMax] = chartOptions.current.xScale.range();
      const lineX = x < xMin ? xMin : x > xMax ? xMax : x;
      attributes.current
        .append('line')
        .attr('x1', lineX)
        .attr('y1', 0)
        .attr('x2', lineX)
        .attr('y2', height)
        .attr('class', 'HoverLine')
        .style('stroke-width', 1)
        .style('stroke-dasharray', '4 2')
        .style('fill', 'none');

      if (xAxisValue.current) {
        xAxisValue.current.remove();
        xAxisValue.current = null;
      }

      const xAlignment = chart.settings.persistent.xAlignment;
      let xAxisValueText;

      switch (xAlignment) {
        case 'epoch':
          xAxisValueText = Object.values(
            traceList.epochSteps[props.index],
          ).findIndex((epoch) => epoch.includes(+step));
          break;
        case 'relative_time':
          xAxisValueText = shortEnglishHumanizer(Math.round(+step * 1000), {
            ...humanizerConfig.current,
            maxDecimalPoints: 2,
          });
          break;
        case 'absolute_time':
          xAxisValueText = moment.unix(+step).format('HH:mm:ss D MMM, YY');
          break;
        default:
          xAxisValueText = step;
      }

      xAxisValue.current = visArea
        .append('div')
        .attr('class', 'ChartMouseValue xAxis')
        .style(
          'top',
          `${
            visBox.current.height -
            (visBox.current.margin.bottom + (isXLogScale ? 5 : 0)) +
            1
          }px`,
        )
        .text(xAxisValueText);

      const axisLeftEdge = visBox.current.width - visBox.current.margin.right;
      const xAxisValueWidth = xAxisValue.current.node().offsetWidth;
      xAxisValue.current.style(
        'left',
        `${
          x + visBox.current.margin.left + xAxisValueWidth / 2 > axisLeftEdge
            ? axisLeftEdge - xAxisValueWidth / 2
            : x + visBox.current.margin.left
        }px`,
      );
    }

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
          runIndex++;
          return;
        }
        const { run, metric, trace } = series;

        if (run.metricIsHidden) {
          runIndex++;
          return;
        }

        let { closestStep, stepData } = getClosestStepData(
          step,
          trace?.data,
          trace?.axisValues,
        );

        let val = stepData?.[0] ?? null;

        if ((isXLogScale && closestStep <= 0) || (isYLogScale && val <= 0)) {
          runIndex++;
          return;
        }

        if (val !== null) {
          x = chartOptions.current.xScale(closestStep);
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

          let shoudDrawHorizontalHoverLine =
            focusedLineAttr.runHash === run.run_hash &&
            focusedLineAttr.metricName === metric?.name &&
            focusedLineAttr.traceContext === traceContext;

          if (shoudDrawHorizontalHoverLine) {
            // Draw horizontal hover line
            const [yMax, yMin] = chartOptions.current.yScale.range();
            const lineY = y < yMin ? yMin : y > yMax ? yMax : y;
            attributes.current
              .append('line')
              .attr('x1', 0)
              .attr('y1', lineY)
              .attr('x2', width)
              .attr('y2', lineY)
              .attr('class', 'HoverLine')
              .style('stroke-width', 1)
              .style('stroke-dasharray', '4 2')
              .style('fill', 'none');

            circles.current.moveToFront();

            if (yAxisValue.current) {
              yAxisValue.current.remove();
              yAxisValue.current = null;
            }

            const formattedValue = Math.round(val * 10e9) / 10e9;
            yAxisValue.current = visArea
              .append('div')
              .attr('class', 'ChartMouseValue yAxis')
              .attr('title', formattedValue)
              .style('max-width', `${visBox.current.margin.left - 5}px`)
              .style(
                'right',
                `${visBox.current.width - visBox.current.margin.left - 2}px`,
              )
              .style('top', `${lineY + visBox.current.margin.top}px`)
              .text(formattedValue);
          }

          const [xMin, xMax] = chartOptions.current.xScale.range();
          const [yMax, yMin] = chartOptions.current.yScale.range();

          let circle = null;
          if (
            x > xMin - circleActiveRadius &&
            x < xMax + circleActiveRadius &&
            y > yMin - circleActiveRadius &&
            y < yMax + circleActiveRadius
          ) {
            circle = circles.current
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
          }

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
        const focusedCircleX = chartOptions.current.xScale(focusedCircle.step);
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
              .attr('data-step', focusedCircle.step)
              .attr('data-run-hash', focusedCircle.runHash)
              .attr('data-metric-name', focusedCircle.metricName)
              .attr('data-trace-context-hash', focusedCircle.traceContext)
              .attr('clip-path', 'url(#lines-rect-clip-' + props.index + ')')
              .style('fill', getMetricColor(line.run, line.metric, line.trace))
              .on('click', function () {
                handlePointClick(
                  focusedCircle.step,
                  focusedCircle.runHash,
                  focusedCircle.metricName,
                  focusedCircle.traceContext,
                );
              })
              .moveToFront();
          }
        }
      }
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
        zoomMode: !chart.settings.singleZoomMode,
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

          circles.current.selectAll('.HoverCircle').each(function () {
            const elem = d3.select(this);
            const elemX = parseFloat(elem.attr('data-x'));
            const elemY = parseFloat(elem.attr('data-y'));
            const rX = Math.abs(elemX - x);
            const rY = Math.abs(elemY - y);
            const r = Math.sqrt(Math.pow(rX, 2) + Math.pow(rY, 2));

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
    const { chart } = HubMainScreenModel.getState();
    const { width, height, margin } = visBox.current;
    const padding = 5;
    const isXLogScale =
      scaleOptions[chart.settings.persistent.xScale] === 'log';

    return (
      mouse[0] > margin.left - padding &&
      mouse[0] < width - margin.right + padding &&
      mouse[1] > margin.top - padding &&
      mouse[1] < height - (margin.bottom + (isXLogScale ? 5 : 0)) + padding
    );
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
        HubMainScreenModel.events.SET_CHART_HIDDEN_METRICS,
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
          if (yAxisValue.current) {
            yAxisValue.current.remove();
            yAxisValue.current = null;
          }
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

export default React.memo(PanelChart);
