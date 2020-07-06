import './Panel.less';

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import moment from 'moment';

import * as classes from '../../../../../constants/classes';
import * as storeUtils from '../../../../../storeUtils';
import { classNames, buildUrl } from '../../../../../utils';
import { HUB_PROJECT_EXPERIMENT, HUB_PROJECT_EXECUTABLE_PROCESS_DETAIL } from '../../../../../constants/screens';
import UI from '../../../../../ui';
import PopUp from '../PopUp/PopUp';
import HubMainScreenContext from '../../HubMainScreenContext/HubMainScreenContext';

const d3 = require('d3');

const popUpDefaultWidth = 250;
const popUpDefaultHeight = 200;
const circleRadius = 4;
const circleActiveRadius = 7;


class Panel extends Component {
  constructor(props) {
    super(props);

    this.state = {
      visBox: {
        ratio: this.props.ratio,
        margin: {
          top: 20, right: 20, bottom: 30, left: 60,
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
      hoverLine: {
        display: false,
      },
      chartPopUp: {
        display: false,
        left: 0,
        top: 0,
        selectedTags: [],
        selectedTagsLoading: false,
        lineData: {},
        lineIndex: null,
        pointData: {},
      },
      tagPopUp: {
        display: false,
        loading: false,
        left: 0,
        top: 0,
        tags: [],
      },
      commitPopUp: {
        display: false,
        left: 0,
        top: 0,
        content: null,
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
    this.hoverCircles = null;
    this.dataSnapshot = null;

    this.curves =  [
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

    this.scale = [
      'scaleLinear',
      'scaleLog',
    ];
  }

  componentDidMount() {
    this.initD3();
    this.draw();
    window.addEventListener('resize', () => this.resize());
  }

  componentWillUnmount() {
    window.removeEventListener('resize', () => this.resize());
  }

  dataDidUpdate() {
    this.draw();
  }

  settingsDidUpdate() {
    this.draw();
  }

  initD3 = () => {
    d3.selection.prototype.moveToFront = function() {
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };
  };

  resize = () => {
    this.draw();
  };

  draw = (clear=true) => {
    if (!this.isEmpty()) {
      if (clear) {
        // Clear panel: hide popups and remove hover
        this.hideHoverLine();
        if (this.hoverCircles) {
          this.hoverCircles.selectAll('*.focus').remove();
        }
        this.hideActionPopUps(false);
      }

      // FIX: Check if visRef has been mounted
      if (!this.visRef.current) {
        setTimeout( () => this.draw(clear), 20);
        return;
      }

      this.initArea().then(() => this.plotData());
    }
  };

  isEmpty = () => {
    return !this.context.data || !this.context.data.length;
  };

  initArea = () => {
    return new Promise((resolve) => {
      const visArea = d3.select(this.visRef.current);
      visArea.selectAll('*').remove();
      visArea.attr('style', null);

      const parent = d3.select(this.parentRef.current);
      const parentRect = parent.node().getBoundingClientRect();
      const parentWidth = parentRect.width;
      const parentHeight = parentRect.height;

      const { margin, ratio } = this.state.visBox;
      const width = this.props.width ? this.props.width : parentWidth;
      const height = this.props.height ? this.props.height : (
        this.props.ratio ? width * ratio : parentHeight
      );

      let xNum = 0, xMax = 0, xSteps = [];
      this.context.data.forEach(i => {
        if (i.num_steps > xMax) {
          xMax = i.num_steps;
        }
        if (i.data.length > xNum) {
          xNum = i.data.length;
          xSteps = i.data.map(s => s.step);
        }
      });

      // X and Y scales
      const xScale = d3.scaleLinear()
        .domain([0, xMax])
        .range([0, width - margin.left - margin.right]);

      let yMax = d3.max(this.context.data.map((i) => Math.max(...i.data.map(i => i.value))));
      let yMin = d3.min(this.context.data.map((i) => Math.min(...i.data.map(i => i.value))));

      let yScaleBase;
      if (this.scale[this.context.settings.yScale] === 'scaleLinear') {
        const diff = yMax - yMin;
        yMax += diff * 0.1;
        yMin -= diff * 0.05;
        yScaleBase = d3.scaleLinear();
      } else if (this.scale[this.context.settings.yScale] === 'scaleLog') {
        yScaleBase = d3.scaleLog();
      }

      const yScale = yScaleBase
        .domain([yMin, yMax])
        .range([height - margin.top - margin.bottom, 0]);

      this.setState({
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
          ...this.state.chart,
          xNum,
          xMax,
          xSteps,
          xScale,
          yScale,
        },
      }, () => {
        visArea.style('width', `${this.state.visBox.width}px`)
          .style('height', `${this.state.visBox.height}px`);

        const handleAreaMouseOver = this.handleAreaMouseOver;
        const handleAreaMouseMove = this.handleAreaMouseMove;
        const handleAreaMouseOut = this.handleAreaMouseOut;

        this.svg = visArea.append('svg')
          .attr('width', width)
          .attr('height', height)
          .on('mouseover', function () {
            handleAreaMouseOver();
          })
          .on('mousemove', function () {
            handleAreaMouseMove(d3.mouse(this));
          })
          .on('mouseout', function () {
            handleAreaMouseOut(d3.mouse(this));
          });

        const handleBgRectClick = this.handleBgRectClick;

        this.bgRect = this.svg.append('rect')
          .attr('x', margin.left)
          .attr('y', margin.top)
          .attr('width', width - margin.left - margin.right)
          .attr('height', height - margin.top - margin.bottom)
          .style('fill', 'transparent')
          .on('click', function () {
            handleBgRectClick();
          });

        this.plot = this.svg.append('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);

        resolve();
      });
    });
  };

  plotData = () => {
    const data = this.context.data;

    if (!data || !data.length) {
      return;
    }

    const { height } = this.state.plotBox;

    // X and Y axis
    this.plot.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(this.state.chart.xScale));

    this.plot.append('g')
      .attr('class', 'y axis')
      .call(d3.axisLeft(this.state.chart.yScale));

    // const handleLineClick = this.handleLineClick;
    // const handlePointClick = this.handlePointClick;
    // const handleLineMouseOver = this.handleLineMouseOver;
    // const handleLineMouseOut = this.handleLineMouseOut;

    this.hoverLine = this.plot.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', height)
      .attr('class', 'HoverLine')
      .style('stroke-width', 1)
      .style('fill', 'none')
      .style('display', 'none');

    // Lines
    data.forEach((commit, i) => {
      const line = d3.line()
        .x((d, i) => this.state.chart.xScale(d.step))
        .y(d => this.state.chart.yScale(d.value))
        .curve(d3[this.curves[5]]);

      this.plot.append('path')
        .datum(commit.data)
        .attr('data-hash', commit.hash)
        .style('stroke', this.context.getLineColor(commit))
        .style('fill', 'none')
        .attr('class', `PlotLine PlotLine-${i}`)
        .attr('d', line);
      // .on('click', function () {
      //   handleLineClick(d3.select(this), d3.mouse(this));
      // })
      // .on('mouseover', function () {
      //   handleLineMouseOver(d3.select(this));
      // })
      // .on('mouseout', function () {
      //   handleLineMouseOut(d3.select(this));
      // });
    });

    this.hoverCircles = this.plot.append('g');

    this.showHoverLine(0);
    this.moveHoverLine(0);

    // Glow effect
    //
    // const defs = svg.append('defs');
    // const glowDeviation = '2';
    //
    // const filter = defs.append('filter').attr('id', 'glow');
    // filter.append('feGaussianBlur')
    //   .attr('stdDeviation', glowDeviation)
    //   .attr('result', 'coloredBlur');
    //
    // const feMerge = filter.append('feMerge');
    // feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    // feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    //
    // d3.selectAll('.glowed').style('filter', 'url(#glow)');
  };

  showHoverLine = (x) => {
    this.hoverLine
      .style('display', null);
  };

  moveHoverLine = (x) => {
    const data = this.state.chart.xSteps;

    let p = 0;

    if (x) {
      const xPoint = this.state.chart.xScale.invert(x);
      const index = d3.bisect(data, xPoint, 1);
      const a = data[index - 1];
      const b = data[index];

      p = xPoint - a > b - xPoint ? b : a;
    }

    const lineX = this.state.chart.xScale(p);

    if (this.context.contextStepIndex === p) {
      return;
    }

    // Remove circles
    this.hoverCircles.selectAll('*:not(.focus)').remove();

    this.hoverLine
      .attr('x1', lineX)
      .attr('x2', lineX);

    this.drawHoverCircles(lineX, p);

    this.setState(prevState => ({
      ...prevState,
      hoverLine: {
        ...prevState.hoverLine,
        display: true,
      },
    }));

    this.context.setContextStepIndex(p);
  };

  hideHoverLine = () => {
    if (!this.state.hoverLine.display) {
      return;
    }

    this.plot.selectAll('.PlotLine').classed('active', false);

    this.hoverCircles.selectAll('*:not(.focus)').remove();

    this.hoverLine
      .style('display', 'none');
    this.setState(prevState => ({
      ...prevState,
      hoverLine: {
        ...prevState.hoverLine,
        display: false,
      },
    }));
  };

  positionPopUp = (x, y, chained=null, popUpWidth=popUpDefaultWidth, popUpHeight=popUpDefaultHeight) => {
    const { margin } = this.state.visBox;
    const { width, height } = this.state.plotBox;

    const leftOverflow = x => popUpWidth + x > width;
    const topOverflow = y => popUpHeight + y > height;

    let left = 0, top = 0, chainArrow = null;

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

      if (topOverflow(y)) {
        top = y - popUpHeight + margin.top;
      } else {
        top = y + margin.top;
      }
    }

    return {
      left,
      top,
      chainArrow,
    };
  };

  hideActionPopUps = (onlySecondary=false, callback=null) => {
    this.setState(prevState => {
      const state = {
        ...prevState,
        tagPopUp: {
          ...prevState.tagPopUp,
          display: false,
        },
        commitPopUp: {
          ...prevState.tagPopUp,
          display: false,
        }
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
    }, () => {
      if (callback) {
        callback();
      }
    });
  };

  drawHoverCircles = (lineX, pIndex) => {
    // TODO: rerender only when pIndex is changed

    const handlePointClick = this.handlePointClick;

    // Draw circles
    for (let lineIndex in this.context.data) {
      const line = this.context.data[lineIndex];
      const lineVal = this.context.getLineValueByStep(line.data, pIndex);
      if (lineVal) {
        const x = lineX;
        const y = this.state.chart.yScale(lineVal);

        let focusElemExists = false;
        this.hoverCircles.select('*.focus').each(function (d) {
          const focusElem = d3.select(this);
          if (focusElem.attr('data-x') == lineX && focusElem.attr('data-y') == y) {
            focusElemExists = true;
          }
        });
        if (focusElemExists) {
          continue;
        }

        this.hoverCircles.append('circle')
          .attr('class', `HoverCircle HoverCircle-${pIndex}`)
          .attr('cx', lineX)
          .attr('cy', y)
          .attr('r', circleRadius)
          .attr('data-x', lineX)
          .attr('data-y', y)
          .attr('data-index', pIndex)
          .attr('data-line-index', lineIndex)
          .attr('data-line-hash', line.hash)
          .style('fill', this.context.getLineColor(line))
          .on('click', function () {
            handlePointClick(lineIndex, x, y, pIndex, d3.select(this));
          });
      }
    }

    this.hoverCircles.selectAll('*.focus').moveToFront();
  };

  targetHoverCircle = (x, y) => {
    this.hoverCircles.selectAll('*.focus').moveToFront();

    let nearestY = null, nearestIndex = null, nearestHash = null, nearestCircle = null;

    // Find the nearest circle
    this.hoverCircles.selectAll('.HoverCircle').each(function (d) {
      const elem = d3.select(this);
      const elemY = elem.attr('data-y');
      const r = Math.abs(elemY - y);

      if (nearestY === null || r < nearestY) {
        nearestY = r;
        nearestIndex = parseInt(elem.attr('data-line-index'));
        nearestHash = elem.attr('data-line-hash');
        nearestCircle = elem;
      }

      if (!elem.classed('focus')) {
        elem.classed('active', false).attr('r', circleRadius);
      }
    });

    if (!nearestCircle) {
      return;
    }

    // Update circle
    if (!nearestCircle.classed('focus')) {
      nearestCircle.classed('active', true).attr('r', circleActiveRadius).moveToFront();
    }

    // Update line
    this.plot.selectAll('.PlotLine')
      .classed('active', false);
    // .classed('fade', true);
    this.plot.selectAll(`.PlotLine-${nearestIndex}`)
      .classed('active', true);
    // .classed('fade', false);

    this.context.setContextActiveStepIndex(nearestIndex);
    this.context.setContextActiveStepHash(nearestHash);
  };

  getCommitTags = (lineData) => {
    this.props.getCommitTags(lineData.hash)
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

  handleAreaMouseOver = () => {
  };

  handleAreaMouseMove = (mouse) => {
    const { width, height, margin } = this.state.visBox;
    const padding = 10;

    if (mouse[0] < margin.left - padding || mouse[0] > width - margin.right + padding ||
      mouse[1] < margin.top - padding || mouse[1] > height - margin.bottom + padding) {
      // this.hideHoverLine();
    } else {
      this.showHoverLine(mouse[0]);
      this.moveHoverLine( mouse[0] - margin.left);
      this.targetHoverCircle(mouse[0] - margin.left, mouse[1] - margin.top)
    }
  };

  handleAreaMouseOut = (mouse) => {
    const { width, height, margin } = this.state.visBox;
    const padding = 10;

    if (mouse[0] < margin.left - padding || mouse[0] > width - margin.right + padding ||
      mouse[1] < margin.top - padding || mouse[1] > height - margin.bottom + padding) {
      // this.hideHoverLine();
    }
  };

  handleBgRectClick = () => {
    this.hideActionPopUps();
    this.hoverCircles.selectAll('*.focus').remove();
  };

  handleLineMouseOver = (elem) => {
    // elem.style('stroke-width', 3);
  };

  handleLineMouseOut = (elem) => {
    // elem.style('stroke-width', 1);
  };

  handleLineClick = () => {
  };

  handleProcessKill = (pid, idx) => {
    this.setState(prevState => ({
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
      this.handleCommitInfoClick(idx);
    });
  };

  handleCommitInfoClick = (lineIndex) => {
    const data = this.context.data;
    const lineData = data[lineIndex];

    const pos = this.positionPopUp(
      this.state.chartPopUp.left + popUpDefaultWidth,
      this.state.chartPopUp.top,
      this.state.chartPopUp);

    this.hideActionPopUps(true, () => {
      this.setState(prevState => ({
        ...prevState,
        commitPopUp: {
          ...prevState.commitPopUp,
          display: true,
          left: pos.left,
          top: pos.top,
          chainArrow: pos.chainArrow,
          processKillBtn: {
            loading: false,
            disabled: false,
          },
          content: (
            <>
              <UI.Text type='grey' center>Loading..</UI.Text>
            </>
          ),
        },
      }));

      this.props.getCommitInfo(lineData.branch, lineData.hash).then((data) => {
        const content = (
          <>
            <UI.Text type='grey' small>
              {moment.unix(lineData.date).format('HH:mm · D MMM, YY')}
            </UI.Text>
            <Link
              to={buildUrl(HUB_PROJECT_EXPERIMENT, {
                experiment_name: lineData.branch,
                commit_id: lineData.hash,
              })}
            >
              <UI.Text type='primary'>Detailed View</UI.Text>
            </Link>
            <UI.Line />
            {(!Number.isInteger(lineData.msg) || `${lineData.msg}`.length !== 10) &&
            <>
              <UI.Text type='grey-darker' small spacing>{lineData.msg}</UI.Text>
              <UI.Line />
            </>
            }
            <UI.Text type='grey' small>Experiment: {lineData.branch}</UI.Text>
            <UI.Text type='grey' small>Hash: {lineData.hash}</UI.Text>
            {!!data.process &&
              <>
                <UI.Line />
                {!!data.process.uuid &&
                  <Link to={buildUrl(HUB_PROJECT_EXECUTABLE_PROCESS_DETAIL, {
                    process_id: data.process.uuid
                  })}>
                    <UI.Text>Process</UI.Text>
                  </Link>
                }
                <UI.Text type='grey' small>Process status: {data.process.finish ? 'finished' : 'running'}</UI.Text>
                {!!data.start_date &&
                  <UI.Text type='grey' small>
                    Time: {Math.round((
                      data.process.finish
                        ? (data.date - data.start_date)
                        : data.process.time
                    ))}s
                  </UI.Text>
                }
                {!!data.process.pid &&
                  <div className='CommitPopUp__process'>
                    <UI.Text type='grey' small inline>PID: {data.process.pid} </UI.Text>
                    <UI.Button
                      onClick={() => this.handleProcessKill(data.process.pid, lineIndex)}
                      type='negative'
                      size='tiny'
                      inline
                      {...this.state.commitPopUp.processKillBtn}
                    >
                      Kill
                    </UI.Button>
                  </div>
                }
              </>
            }
          </>
        );

        this.setState(prevState => ({
          ...prevState,
          commitPopUp: {
            ...prevState.commitPopUp,
            content: content,
          },
        }));
      });
    });
  };

  handlePointClick = (lineIndex, x, y, pointX, pointElem) => {
    const data = this.context.data;
    const lineData = data[lineIndex];
    const pointData = this.context.getLineDataByStep(lineData.data, pointX);

    const pos = this.positionPopUp(x, y);

    this.hoverCircles.selectAll('*.focus').each(function (d) {
      const circle = d3.select(this);

      circle.classed('focus', false)
        .attr('r', circleRadius);

      if (circle.attr('data-x') != x) {
        circle.remove();
      }
    });

    pointElem
      .classed('focus', true)
      .classed('active', false)
      .attr('r', circleActiveRadius)
      .moveToFront();

    this.hideActionPopUps(false, () => {
      this.setState((prevState) => {
        return {
          ...prevState,
          chartPopUp: {
            left: pos.left,
            top: pos.top,
            display: true,
            selectedTags: [],
            selectedTagsLoading: true,
            lineData,
            lineIndex,
            pointData,
          },
        };
      });

      this.getCommitTags(lineData);
    });
  };

  handleTooltipClick = () => {
    // TODO: hide action tooltips on tooltip click
    // this.hideActionTooltips();
    // this.hoverCircles.selectAll('*.focus').remove();
  };

  handleTagItemClick = (lineData, tag) => {
    this.setState((prevState) => ({
      ...prevState,
      chartPopUp: {
        ...prevState.chartPopUp,
        selectedTagsLoading: true,
      },
    }));

    this.props.updateCommitTag({
      commit_hash: lineData.hash,
      tag_id: tag.id,
      experiment_name: lineData.branch,
    }).then(tagsIds => {
      this.getCommitTags(lineData);
    });
  };

  handleAttachTagClick = (lineData) => {
    const pos = this.positionPopUp(
      this.state.chartPopUp.left + popUpDefaultWidth,
      this.state.chartPopUp.top,
      this.state.chartPopUp);

    this.setState(prevState => ({
      ...prevState,
      tagPopUp: {
        ...prevState.tagPopUp,
        ...pos,
        display: true,
        isLoading: true,
      },
    }));

    this.hideActionPopUps(true, () => {
      this.props.getTags().then(data => {
        this.setState(prevState => ({
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

  _renderContent = () => {
    return (
      <>
        <div ref={this.visRef} className='ControlPanel__svg' />
        <div className='ControlPanel__body'>
          {this.state.chartPopUp.display &&
            <PopUp
              className='ChartPopUp'
              left={this.state.chartPopUp.left}
              top={this.state.chartPopUp.top}
              xGap={true}
            >
              <div>
                <div>
                  {!this.state.chartPopUp.selectedTagsLoading
                    ? (
                      <div className='ControlPanel__popup__tags__wrapper'>
                        <UI.Text overline type='grey-darker'>tag</UI.Text>
                        <div className='ControlPanel__popup__tags'>
                          {this.state.chartPopUp.selectedTags.length
                            ? (
                              <>
                                {this.state.chartPopUp.selectedTags.map((tagItem, i) =>
                                  <UI.Label key={i} color={tagItem.color}>
                                    {tagItem.name}
                                  </UI.Label>
                                )}
                              </>
                            )
                            : <UI.Label>No attached tag</UI.Label>
                          }
                          <div
                            className='ControlPanel__popup__tags__update'
                            onClick={() => this.handleAttachTagClick(this.state.chartPopUp.lineData)}
                          >
                            <UI.Icon i='nc-pencil' />
                          </div>
                        </div>
                      </div>
                    )
                    : (
                      <UI.Text type='grey' center spacingTop>Loading..</UI.Text>
                    )
                  }
                  <UI.Line />
                </div>
                <UI.Text
                  className='link'
                  type='primary'
                  onClick={() => this.handleCommitInfoClick(this.state.chartPopUp.lineIndex)}
                >
                  Run details
                </UI.Text>
                <UI.Line />
                <UI.Text color={this.context.getLineColor(this.state.chartPopUp.lineData)}>
                  {Math.round(this.state.chartPopUp.pointData.value*10e9)/10e9}
                </UI.Text>
                <UI.Text type='grey' small>Epoch {this.state.chartPopUp.pointData.epoch}</UI.Text>
                <UI.Text type='grey' small>Step {this.state.chartPopUp.pointData.step}</UI.Text>
              </div>
            </PopUp>
          }
          {this.state.tagPopUp.display &&
            <PopUp
              className='TagPopUp'
              left={this.state.tagPopUp.left}
              top={this.state.tagPopUp.top}
              chainArrow={this.state.tagPopUp.chainArrow}
              xGap={true}
            >
              {this.state.tagPopUp.isLoading
                ? (
                  <UI.Text type='grey' center>Loading..</UI.Text>
                )
                : (
                  <div className='TagPopUp__tags'>
                    <UI.Text className='TagPopUp__tags__title' type='grey'>Select tag</UI.Text>
                    <UI.Line spacing={false} />
                    <div className='TagPopUp__tags__box'>
                      {this.state.tagPopUp.tags.map((tag, tagKey) =>
                        <UI.Label
                          className={classNames({
                            TagPopUp__tags__item: true,
                            active: this.state.chartPopUp.selectedTags.map(i => i.id).includes(tag.id),
                          })}
                          key={tagKey}
                          color={tag.color}
                          onClick={() => this.handleTagItemClick(this.state.chartPopUp.lineData, tag)}
                        >
                          {tag.name}
                        </UI.Label>
                      )}
                    </div>
                  </div>
                )
              }
            </PopUp>
          }
          {this.state.commitPopUp.display &&
            <PopUp
              className='CommitPopUp'
              left={this.state.commitPopUp.left}
              top={this.state.commitPopUp.top}
              chainArrow={this.state.commitPopUp.chainArrow}
              xGap={true}
            >
              {this.state.commitPopUp.content !== null &&
                <>
                  {this.state.commitPopUp.content}
                </>
              }
            </PopUp>
          }
        </div>
      </>
    );
  };

  _renderPanelMsg = (TextElem) => {
    return (
      <div className='ControlPanel__msg__wrapper'>
        {TextElem}
      </div>
    );
  };

  render() {
    return (
      <div className='ControlPanel' ref={this.parentRef}>
        {this.context.isLoading
          ? this._renderPanelMsg(<UI.Text type='grey' center>Loading..</UI.Text>)
          : <>
            {this.isEmpty()
              ? this._renderPanelMsg(<UI.Text type='grey' center>No data</UI.Text>)
              : this._renderContent()
            }
          </>
        }
      </div>
    );
  }
}

Panel.defaultProps = {
  width: null,
  height: null,
  ratio: null,
};

Panel.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  ratio: PropTypes.number,
};

Panel.contextType = HubMainScreenContext;

export default storeUtils.getWithState(
  classes.CONTROL_PANEL,
  Panel
);