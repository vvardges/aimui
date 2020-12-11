import './ParallelCoordinatesChart.less';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as _ from 'lodash';

import HubMainScreenContext from '../../../../HubMainScreenContext/HubMainScreenContext';
import {
  classNames,
  formatValue,
  getObjectValueByPath,
} from '../../../../../../../utils';

const d3 = require('d3');

const circleRadius = 4;
const circleActiveRadius = 7;

class ParallelCoordinatesChart extends Component {
  constructor(props) {
    super(props);

    this.state = {
      traces: [],
      dimensions: [],

      visBox: {
        margin: {
          top: 60,
          right: 45,
          bottom: 25,
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
        xScale: null,
      },

      closestAxis: null,
      closestValue: null,
    };

    this.parentRef = React.createRef();
    this.visRef = React.createRef();
    this.bgRect = null;
    this.plot = null;
    this.lines = null;
    this.circles = null;
    this.brushSelection = null;

    this.gradientStartColor = '#2980B9';
    this.gradientEndColor = '#E74C3C';

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
  }

  componentDidMount() {
    this.initD3();
    this.renderChart();
    window.addEventListener('resize', () => this.resize());
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.contextKey !== this.props.contextKey) {
      this.renderChart();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', () => this.resize());
  }

  initD3 = () => {
    d3.selection.prototype.moveToFront = function () {
      return this.each(function () {
        this.parentNode.appendChild(this);
      });
    };
  };

  resize = () => {
    this.renderChart();
  };

  renderChart = () => {
    this.clear();

    if (this.context.runs.isLoading || this.context.runs.isEmpty) {
      return;
    }

    this.draw(!!this.brushSelection);
  };

  clear = () => {
    if (!this.visRef.current) {
      return;
    }

    const visArea = d3.select(this.visRef.current);
    visArea.selectAll('*').remove();
    visArea.attr('style', null);
  };

  draw = (recoverBrushSelection = false) => {
    if (!this.visRef.current) {
      return;
    }

    const traces = [];
    this.context.traceList?.traces.forEach((traceModel) => {
      if (traceModel.chart !== this.props.index) {
        return;
      }
      traces.push(traceModel.clone());
    });

    this.setState(
      {
        traces,
        dimensions: this.getDimensions(traces),
      },
      () => {
        this.drawArea(recoverBrushSelection);
      },
    );
  };

  handleAreaMouseMove = (mouse) => {
    if (!this.context.chart.focused.circle.active) {
      const x = mouse[0] - this.state.visBox.margin.left;
      const y = mouse[1] - this.state.visBox.margin.top;
      let diffX;
      let diffY;
      let axis;
      let currAxis = null;
      let currValue = null;
      let currIndex;
      const prevAxis = this.state.closestAxis;
      this.state.dimensions.forEach((dim, index) => {
        axis = this.state.chart.xScale(index);
        if (index === 0) {
          diffX = Math.abs(x - axis);
          currAxis = axis;
          currIndex = index;
        } else if (diffX > Math.abs(x - axis)) {
          diffX = Math.abs(x - axis);
          currAxis = axis;
          currIndex = index;
        }
      });
      if (currAxis !== this.state.closestAxis) {
        this.clearLines();
        this.clearCircles();
        this.setState(
          {
            closestAxis: currAxis,
          },
          this.drawData,
        );
      }
      let runHash;
      this.state.traces.forEach((traceModel) =>
        traceModel.series.forEach((series, index) => {
          const params = series.getParamsFlatDict();
          const { run } = series;
          let dim = this.state.dimensions[currIndex];
          let val;

          if (dim.contentType === 'param') {
            // check if data element has property and contains a value
            if (!(dim.key in params) || params[dim.key] === null) {
              return null;
            }
            val = params[dim.key];
          } else {
            val = series.getAggregatedMetricValue(dim.metricName, dim.context);
          }
          if (dim.scale(val) !== undefined) {
            if (currValue === null) {
              currValue = dim.scale(val);
              diffY = Math.abs(y - currValue);
              runHash = run.run_hash;
            } else if (diffY > Math.abs(y - dim.scale(val))) {
              currValue = dim.scale(val);
              diffY = Math.abs(y - currValue);
              runHash = run.run_hash;
            }
          }
        }),
      );
      if (
        currValue !== null &&
        (currValue !== this.state.closestValue || prevAxis !== currAxis)
      ) {
        this.setState(
          {
            closestValue: currValue,
          },
          () => {
            this.context.setChartFocusedState({
              metric: {
                runHash: runHash,
                metricName: null,
                traceContext: null,
              },
            });
          },
        );
      }
    }
  };

  handleAreaMouseOut = () => {
    this.setState({
      closestAxis: null,
      closestValue: null,
    });
    this.context.setChartFocusedState({
      metric: {
        runHash: null,
        metricName: null,
        traceContext: null,
      },
    });
  };

  handleBgRectClick = () => {
    if (!this.context.chart.focused.circle.active) {
      return;
    }

    this.context.setChartFocusedState({
      circle: {
        runHash: null,
        metricName: null,
        traceContext: null,
      },
    });
  };

  getDimensions = (traces) => {
    const types = {
      number: {
        key: 'number',
        coerce: (d) => +d,
        extent: d3.extent,
        within: (d, extent, dim) =>
          extent[0] <= dim.scale(d) && dim.scale(d) <= extent[1],
        defaultScale: (height) => d3.scaleLinear().range([height, 0]),
      },
      string: {
        key: 'string',
        coerce: String,
        extent: (data) => data.sort(),
        within: (d, extent, dim) =>
          extent[0] <= dim.scale(d) && dim.scale(d) <= extent[1],
        defaultScale: (height) => d3.scalePoint().range([0, height]),
      },
      date: {
        key: 'date',
        coerce: (d) => new Date(d),
        extent: d3.extent,
        within: (d, extent, dim) =>
          extent[0] <= dim.scale(d) && dim.scale(d) <= extent[1],
        defaultScale: (height) => d3.scaleTime().range([height, 0]),
      },
    };

    const dimensions = [];

    this.context.runs.params.forEach((param) => {
      let dimensionType;

      let allNum = true,
        dimensionExists = false;
      traces.forEach((traceModel) =>
        traceModel.series.forEach((series) => {
          const seriesParam = getObjectValueByPath(series.run.params, param);
          if (seriesParam !== undefined) {
            if (typeof seriesParam !== 'number') {
              allNum = false;
            }
            if (typeof seriesParam !== 'undefined') {
              dimensionExists = true;
            }
          }
        }),
      );

      if (!dimensionExists) {
        return;
      }

      if (allNum) {
        dimensionType = types['number'];
      } else {
        dimensionType = types['string'];
      }

      dimensions.push({
        key: param,
        type: dimensionType,
        contentType: 'param',
      });
    });

    Object.keys(this.context.runs.aggMetrics).forEach((metric) => {
      this.context.runs.aggMetrics[metric].forEach((context) => {
        dimensions.push({
          key: `metric-${metric}-${JSON.stringify(context)}`,
          type: types['number'],
          contentType: 'metric',
          context: context,
          metricName: metric,
        });
      });
    });

    return dimensions;
  };

  drawArea = (recoverBrushSelection) => {
    const parent = d3.select(this.parentRef.current);
    const parentRect = parent.node().getBoundingClientRect();

    const { margin } = this.state.visBox;
    const width = parentRect.width;
    const height = parentRect.height;

    const xScale = d3
      .scalePoint()
      .domain(d3.range(this.state.dimensions.length))
      .range([0, width - margin.left - margin.right]);

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
        chart: {
          xScale,
        },
      },
      () => {
        const devicePixelRatio = window.devicePixelRatio || 1;

        const handleAreaMouseMove = this.handleAreaMouseMove;
        const handleAreaMouseOut = this.handleAreaMouseOut;

        const container = d3
          .select(this.visRef.current)
          .append('div')
          .attr('class', 'ParallelCoordinates')
          .style('width', `${this.state.visBox.width}px`)
          .style('height', `${this.state.visBox.height}px`);
        // .on('mouseout', function() {
        //   handleAreaMouseOut();
        // });

        this.svg = container
          .append('svg')
          .attr('width', this.state.visBox.width)
          .attr('height', this.state.visBox.height)
          .on('mousemove', function () {
            handleAreaMouseMove(d3.mouse(this));
          });

        this.bgRect = this.svg
          .append('rect')
          .attr('x', margin.left)
          .attr('y', margin.top)
          .attr('width', width - margin.left - margin.right)
          .attr('height', height - margin.top - margin.bottom)
          .style('fill', 'transparent')
          .on('click', this.handleBgRectClick);

        if (this.context.traceList?.grouping.chart) {
          this.svg
            .append('text')
            .attr('x', width / 2)
            .attr('y', 15)
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

        this.plot = this.svg
          .append('g')
          .attr(
            'transform',
            'translate(' + margin.left + ', ' + margin.top + ')',
          );

        this.lines = this.plot.append('g').attr('class', 'Lines');

        const axis = this.plot
          .selectAll('.ParCoordsAxis')
          .data(this.state.dimensions)
          .enter()
          .append('g')
          .attr('class', (d) => `ParCoordsAxis ParCoordsAxis-${d.key}`)
          .attr(
            'transform',
            (d, i) => `translate(${this.state.chart.xScale(i)})`,
          );

        this.circles = this.plot.append('g').attr('class', 'Circles');

        // Draw color
        if (this.displayParamsIndicator()) {
          const lg = this.plot
            .append('linearGradient')
            .attr('id', `ParCoordsGradient-${this.props.index}`)
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', 0)
            .attr('y2', 1);

          lg.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', this.gradientEndColor);

          lg.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', this.gradientStartColor);

          this.plot
            .append('rect')
            .attr('x', this.state.plotBox.width)
            .attr('y', 0)
            .attr('width', 15)
            .attr('height', this.state.plotBox.height - 1)
            .attr('stroke', '#777')
            .attr('stroke-width', 1)
            .attr('fill', `url(#ParCoordsGradient-${this.props.index})`);
        }

        this.state.traces.forEach((traceModel) =>
          traceModel.series.forEach((series) => {
            const seriesParams = series.getParamsFlatDict();

            this.state.dimensions.forEach((p) => {
              if (p.contentType !== 'param') {
                return;
              }
              seriesParams[p.key] = !seriesParams[p.key]
                ? null
                : p.type.coerce(seriesParams[p.key]);
            });

            // Truncate long text strings to fit in data table
            for (let key in seriesParams) {
              if (
                seriesParams[key] &&
                typeof seriesParams[key] === 'string' &&
                seriesParams[key].length > 20
              )
                seriesParams[key] = seriesParams[key].slice(0, 21);
            }
          }),
        );

        const d3_functor = (v) => (typeof v === 'function' ? v : () => v);

        // Type/dimension default setting happens here
        this.state.dimensions.forEach((dim) => {
          if (!('domain' in dim)) {
            // Detect domain using dimension type's extent function
            const domain = [];
            if (dim.contentType === 'param') {
              this.state.traces.forEach((traceModel) =>
                traceModel.series.forEach((series) => {
                  const param = series.getParamsFlatDict()[dim.key];
                  if (param !== undefined) {
                    domain.push(param);
                  }
                }),
              );
            } else {
              this.state.traces.forEach((traceModel) =>
                traceModel.series.forEach((series) => {
                  const aggValue = series.getAggregatedMetricValue(
                    dim.metricName,
                    dim.context,
                  );
                  if (aggValue !== undefined) {
                    domain.push(aggValue);
                  }
                }),
              );
            }
            dim.domain = d3_functor(dim.type.extent)(domain);
          }
          if (!('scale' in dim)) {
            // Use type's default scale for dimension
            dim.scale = dim.type
              .defaultScale(this.state.plotBox.height - 2)
              .copy();
          }
          dim.scale.domain(dim.domain);
        });

        this.drawData();

        const titleWidth =
          this.state.plotBox.width / (this.state.dimensions.length - 1);
        const titles = this.svg
          .selectAll('.ParCoordsTitle')
          .data(this.state.dimensions)
          .enter()
          .append('g')
          .attr('class', (d) => 'ParCoordsTitle')
          .attr('transform', (d, i) => {
            const left =
              this.state.chart.xScale(i) + this.state.visBox.margin.left;
            const width =
              i === 0 || i === this.state.dimensions.length - 1
                ? titleWidth
                : titleWidth * 2;
            return (
              'translate(' +
              (i === 0
                ? left
                : i === this.state.dimensions.length - 1
                  ? left - width
                  : left - width / 2) +
              ', ' +
              (i % 2 === 0 ? 15 : 35) +
              ')'
            );
          })
          .append('foreignObject')
          .attr('width', (d, i) =>
            i === 0 || i === this.state.dimensions.length - 1
              ? titleWidth
              : titleWidth * 2,
          )
          .attr('height', 20)
          .html((d, i) => {
            const wrapperClassName = classNames({
              ParCoordsTitle__wrapper: true,
              left: i === 0,
              center: i > 0 && i < this.state.dimensions.length - 1,
              right: i === this.state.dimensions.length - 1,
              small: titleWidth < 100,
              metric: d.contentType === 'metric',
              param: d.contentType === 'param',
            });

            let description, strDescription;
            if (d.contentType === 'metric') {
              const contextDesc = !!d.context
                ? Object.keys(d.context)
                  .map((k) => `${k}=${formatValue(d.context[k])}`)
                  .join(', ')
                : '';
              description = contextDesc
                ? `${d.metricName} <span class='ParCoordsTitle__content__context'>${contextDesc}</span>`
                : d.metricName;
              strDescription = contextDesc
                ? `${d.metricName} ${contextDesc}`
                : d.metricName;
            } else {
              description = d.key;
              strDescription = d.key;
            }

            return `
            <div class='${wrapperClassName}'>
              <div class='ParCoordsTitle__content' title='${strDescription}'>
                 ${description}
              </div>
            </div>
          `;
          });

        axis.append('g').each(function (d) {
          const renderAxis =
            'axis' in d
              ? d.axis.scale(d.scale) // Custom axis
              : d3.axisLeft().scale(d.scale); // Default axis
          d3.select(this).call(renderAxis);
        });

        // Add and store a brush for each axis.
        const handleBrushStart = this.handleBrushStart;
        const handleBrushEvent = this.handleBrushEvent;

        const brushHeight = this.state.plotBox.height;
        const brushSelection = this.brushSelection;
        axis
          .append('g')
          .attr('class', 'ParCoordsAxis__brush')
          .each(function (d) {
            d3.select(this).call(
              (d.brush = d3
                .brushY()
                .extent([
                  [-10, 0],
                  [10, brushHeight],
                ])
                .on('start', handleBrushStart)
                .on('brush', function () {
                  handleBrushEvent();
                })
                .on('end', function () {
                  handleBrushEvent();
                })),
            );
            brushSelection?.find(
              (selection) => selection?.dimension.key === d.key,
            )?.extent;
            if (recoverBrushSelection) {
              d.brush.move(
                d3.select(this),
                brushSelection?.find(
                  (selection) => selection?.dimension.key === d.key,
                )?.extent ?? null,
              );
            }
          })
          .selectAll('rect')
          .attr('x', -10)
          .attr('width', 20);

        if (recoverBrushSelection) {
          this.handleBrushEvent(this.brushSelection);
        }
      },
    );
  };

  drawData = () => {
    const dimensions = this.state.dimensions;
    const xScale = this.state.chart.xScale;
    const focused = this.context.chart.focused;
    const focusedMetric = focused.metric;
    const focusedCircle = focused.circle;

    const lastDim = dimensions[dimensions.length - 1];
    let color;

    if (lastDim) {
      const lastDimValues = this.context.traceList?.traces
        .map((t) =>
          t.series.map((s) => {
            if (t.chart !== this.props.index) {
              return undefined;
            }

            if (lastDim.contentType === 'param') {
              const params = s.getParamsFlatDict();
              if (lastDim.key in params) {
                return params[lastDim.key];
              }
            } else {
              return s.getAggregatedMetricValue(
                lastDim.metricName,
                lastDim.context,
              );
            }
            return undefined;
          }),
        )
        .flat()
        .filter((v) => v !== undefined);

      color = d3
        .scaleSequential()
        .domain([_.min(lastDimValues), _.max(lastDimValues)])
        .interpolator(
          d3.interpolateRgb(this.gradientStartColor, this.gradientEndColor),
        );
    } else {
      color = d3
        .scaleSequential()
        .interpolator(
          d3.interpolateRgb(this.gradientStartColor, this.gradientEndColor),
        );
    }

    this.state.traces.forEach((traceModel) =>
      traceModel.series.forEach((series) => {
        const params = series.getParamsFlatDict();

        const coords = this.state.dimensions.map((p, i) => {
          let val;

          if (p.contentType === 'param') {
            // check if data element has property and contains a value
            if (!(p.key in params) || params[p.key] === null) {
              return null;
            }
            val = params[p.key];
          } else {
            val = series.getAggregatedMetricValue(p.metricName, p.context);
          }

          return p.scale(val) === undefined ? null : [xScale(i), p.scale(val)];
        });

        let colorVal;
        if (lastDim?.contentType === 'metric') {
          colorVal = series.getAggregatedMetricValue(
            lastDim.metricName,
            lastDim.context,
          );
        } else {
          colorVal = params[lastDim.key];
        }

        const strokeStyle = this.displayParamsIndicator()
          ? lastDim?.key && !!color(colorVal)
            ? color(colorVal)
            : '#999999'
          : this.context.traceList?.grouping?.color?.length > 0
            ? traceModel.color
            : this.context.getMetricColor(series.run, null, null);

        const strokeDashArray = traceModel.stroke.split(' ');

        const lineFunction = d3
          .line()
          .x((d) => d[0])
          .y((d) => d[1])
          .curve(
            d3[
              this.curves[
                this.context.chart.settings.persistent.interpolate ? 5 : 0
              ]
            ],
          );

        let lines = [[]];
        let lineIndex = 0;

        const { run } = series;
        const handlePointClick = this.handlePointClick;

        coords.forEach((p, i) => {
          const prev = coords[i - 1];
          if (p === null) {
            if (i !== 0) {
              lineIndex++;
              lines[lineIndex] = [null];
              if (prev !== null) {
                lines[lineIndex].push([prev[0], prev[1]]);
              }
            }
          } else {
            if (p[0] === undefined || p[1] === undefined) {
              lineIndex++;
              lines[lineIndex] = [];
            } else {
              lines[lineIndex].push(p);
              if (
                focusedMetric.runHash === run.run_hash ||
                focusedCircle.runHash === run.run_hash ||
                this.state.closestAxis === p[0]
              ) {
                this.circles
                  .append('circle')
                  .attr(
                    'class',
                    `ParCoordsCircle ParCoordsCircle-${this.context.traceToHash(
                      run.run_hash,
                      null,
                      null,
                    )} ${
                      !focusedCircle.runHash &&
                      focusedMetric.runHash === run.run_hash &&
                      this.state.closestValue === p[1]
                        ? 'active'
                        : ''
                    } ${focusedCircle.runHash === run.run_hash ? 'focus' : ''}`,
                  )
                  .attr('cx', p[0])
                  .attr('cy', p[1])
                  .attr(
                    'r',
                    !focusedCircle.runHash &&
                      focusedMetric.runHash === run.run_hash &&
                      this.state.closestValue === p[1]
                      ? circleActiveRadius
                      : circleRadius,
                  )
                  .attr('data-x', p[0])
                  .attr('data-y', p[1])
                  .style('fill', strokeStyle)
                  .on('click', function () {
                    handlePointClick(run.run_hash, null, null);
                  });
              }
              if (lines[lineIndex][0] === null) {
                lineIndex++;
                lines[lineIndex] = [];
                lines[lineIndex].push(p);
              }
            }
          }
        });

        lines.forEach((line) => {
          if (line[0] === null) {
            this.lines
              .append('path')
              .attr('d', lineFunction(line.slice(1)))
              .attr(
                'class',
                `ParCoordsLine ParCoordsLine-${this.context.traceToHash(
                  run.run_hash,
                  null,
                  null,
                )} silhouette`,
              )
              .style('fill', 'none');
          } else {
            this.lines
              .append('path')
              .attr('d', lineFunction(line))
              .attr(
                'class',
                `ParCoordsLine ParCoordsLine-${this.context.traceToHash(
                  run.run_hash,
                  null,
                  null,
                )}`,
              )
              .style('fill', 'none')
              .style('stroke', strokeStyle)
              .style('stroke-dasharray', strokeDashArray)
              .moveToFront();
          }
        });
      }),
    );

    if (focusedCircle.runHash !== null || focusedMetric.runHash !== null) {
      const focusedLineAttr =
        focusedCircle.runHash !== null ? focusedCircle : focusedMetric;
      this.lines
        .selectAll(
          `.ParCoordsLine-${this.context.traceToHash(
            focusedLineAttr.runHash,
            null,
            null,
          )}`,
        )
        .classed('active', true)
        .moveToFront();
      this.circles
        .selectAll(
          `.ParCoordsCircle-${this.context.traceToHash(
            focusedLineAttr.runHash,
            null,
            null,
          )}`,
        )
        .classed('active', true)
        .attr('r', circleActiveRadius)
        .moveToFront();
    }
  };

  clearLines = () => {
    this.lines?.selectAll('*')?.remove();
  };

  clearCircles = () => {
    this.circles?.selectAll('*')?.remove();
  };

  displayParamsIndicator = () => {
    return (
      this.context.chart?.settings?.persistent?.indicator &&
      this.state.dimensions?.length > 1
    );
  };

  handlePointClick = (runHash, metricName, traceContext) => {
    this.context.setChartFocusedState(
      {
        circle: {
          active: true,
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

  handleBrushStart = () => {
    d3.event?.sourceEvent?.stopPropagation();
  };

  handleBrushEvent = (brushSelection) => {
    const svg = this.plot;

    let actives = [];
    svg
      .selectAll('.ParCoordsAxis .ParCoordsAxis__brush')
      .filter(function (d) {
        return brushSelection
          ? brushSelection?.find(
            (selection) => selection?.dimension.key === d.key,
          )?.extent
          : d3.brushSelection(this);
      })
      .each(function (d) {
        actives.push({
          dimension: d,
          extent: brushSelection
            ? brushSelection?.find(
              (selection) => selection?.dimension.key === d.key,
            )?.extent
            : d3.brushSelection(this),
        });
      });

    if (!brushSelection) {
      this.brushSelection = actives.length > 0 ? actives : null;
    }
    const traces = [];
    this.context.traceList?.traces.forEach((traceModel) => {
      if (traceModel.chart !== this.props.index) {
        return;
      }
      const chartTrace = traceModel.clone();

      let i = 0;
      while (i < chartTrace.seriesLength) {
        if (
          !actives.every(function (active) {
            let dim = active.dimension;
            // test if point is within extents for each active brush
            const value =
              dim.contentType === 'param'
                ? chartTrace.series[i].getParamsFlatDict()[dim.key]
                : chartTrace.series[i].getAggregatedMetricValue(
                  dim.metricName,
                  dim.context,
                );
            return dim.type.within(value, active.extent, dim);
          })
        ) {
          chartTrace.removeSeries(i);
        } else {
          i += 1;
        }
      }

      traces.push(chartTrace);
    });

    this.clearCircles();
    this.clearLines();

    this.setState(
      {
        traces,
      },
      () => this.drawData(),
    );
  };

  render() {
    return (
      <div className="ParallelCoordinatesChart" ref={this.parentRef}>
        <div ref={this.visRef} className="ParallelCoordinatesChart__svg" />
      </div>
    );
  }
}

ParallelCoordinatesChart.defaultProps = {
  index: 0,
};

ParallelCoordinatesChart.propTypes = {
  index: PropTypes.number,
};

ParallelCoordinatesChart.contextType = HubMainScreenContext;

export default ParallelCoordinatesChart;
