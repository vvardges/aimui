import './HubExperimentsDashboardScreen.less';

import React from 'react';
import { Helmet } from 'react-helmet';
import { Link, withRouter, Redirect } from 'react-router-dom';
import _ from 'lodash';
import Color from 'color';

import ProjectWrapper from '../../../wrappers/hub/ProjectWrapper/ProjectWrapper';
import * as analytics from '../../../services/analytics';
import * as storeUtils from '../../../storeUtils';
import * as classes from '../../../constants/classes';
import UI from '../../../ui';
import SearchBar from '../../../components/hub/SearchBar/SearchBar';

import { buildUrl, deepEqual, interpolateColors, formatValue, classNames, roundValue } from '../../../utils';
import { HUB_PROJECT_EXPERIMENT, EXPLORE } from '../../../constants/screens';
import { setItem } from '../../../services/storage';
import { USER_LAST_SEARCH_QUERY } from '../../../config';
import moment from 'moment';


class HubExperimentsDashboardScreen extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      height: 0,
      subheaderTop: 0,
      isLoading: true,
      redirectToPanel: false,
      runs: [],
      experiments: [],
      selectedExperiments: [],
      selectedRuns: [],
      coloredCols: {}
    };

    this.searchBarRef = React.createRef();
    this.paramKeys = {};
    this.metricKeys = {};
    this.firstMetricName = null;
    this.defaultMetricName = 'loss';
    this.projectWrapperRef = React.createRef();
    this.topHeaderRef = React.createRef();
  }

  componentDidMount() {
    this.getRuns('');
    this.updateWindowDimensions();
    window.addEventListener('resize', this.updateWindowDimensions);

    // Analytics
    analytics.pageView('dashboard');
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowDimensions);
  }

  updateWindowDimensions = () => {
    const wrapper = this.projectWrapperRef.current;
    const projectWrapperHeight = wrapper ? this.projectWrapperRef.current.getHeaderHeight() : null;
    const { height } = this.topHeaderRef.current?.getBoundingClientRect() ?? {};
    if (projectWrapperHeight) {
      this.setState({
        height: window.innerHeight - projectWrapperHeight - 1,
        subheaderTop: height ?? 0
      });
    } else {
      setTimeout(() => this.updateWindowDimensions(), 25);
    }
  };

  getRuns = (query) => {
    window.scrollTo(0, 0);

    this.setState({
      isLoading: true,
    });

    this.props.getRunsByQuery(query).then((data) => {
      this.paramKeys = {};
      this.metricKeys = {};
      const experiments = data?.runs.map(run => run.experiment_name);
      data?.runs.forEach(run => {
        Object.keys(run.params).forEach(paramKey => {
          if (paramKey !== '__METRICS__') {
            if (!this.paramKeys.hasOwnProperty(paramKey)) {
              this.paramKeys[paramKey] = [];
            }
            Object.keys(run.params[paramKey]).forEach(key => {
              if (!this.paramKeys[paramKey].includes(key)) {
                this.paramKeys[paramKey].push(key);
              }
            });
          } else {
            Object.keys(run.params[paramKey]).forEach(metricName => {
              if (this.firstMetricName === null) {
                this.firstMetricName = metricName;
              }
              if (!this.metricKeys.hasOwnProperty(metricName)) {
                this.metricKeys[metricName] = [];
              }
              run.params[paramKey][metricName].forEach(metricContext => {
                const contextDict = {};
                if (metricContext.context !== null) {
                  metricContext.context.forEach(contextItem => {
                    contextDict[contextItem[0]] = contextItem[1];
                  });
                }
                let contextExists = false;
                this.metricKeys[metricName].forEach(existingMetricContext => {
                  if (deepEqual(existingMetricContext, contextDict)) {
                    contextExists = true;
                  }
                });
                if (!contextExists) {
                  this.metricKeys[metricName].push(contextDict);
                }
              });
            });
          }
        });
      });
      
      this.setState({
        runs: data.runs,
        experiments: _.uniq(experiments),
        selectedExperiments: [],
      });
    }).catch(() => {
      this.setState({
        runs: [],
        experiments: [],
        selectedExperiments: [],
      });
    }).finally(() => {
      this.setState({
        isLoading: false,
      }, this.updateWindowDimensions);
    });
  };

  handleSearchBarSubmit = (value) => {
    this.getRuns(value);
  };

  searchByExperiment = (experimentName) => {
    this.searchBarRef?.current?.setValue(`experiment == ${experimentName}`);
  };

  searchExperiments = () => {
    const experiments = this.state.selectedExperiments;
    const experimentsRow = experiments.map(e => `"${e}"`).join(', ');
    const query = `experiment in (${experimentsRow})`;
    this.searchBarRef?.current?.setValue(query);
  };

  exploreExperiments = () => {
    const experiments = this.state.selectedExperiments;
    const experimentsRow = experiments.map(e => `"${e}"`).join(', ');
    const metricName = this.firstMetricName ?? this.defaultMetricName;
    const query = `${metricName} if experiment in (${experimentsRow})`;
    setItem(USER_LAST_SEARCH_QUERY, query);
    this.setState({
      redirectToPanel: true,
    });
  };

  exploreRuns = () => {
    const runs = this.state.selectedRuns;
    const runsRow = runs.map(e => `"${e}"`).join(', ');
    const metricName = this.firstMetricName ?? this.defaultMetricName;
    const query = `${metricName} if run.hash in (${runsRow})`;
    setItem(USER_LAST_SEARCH_QUERY, query);
    this.setState({
      redirectToPanel: true,
    });
  };

  exploreMetric = (metricName, context) => {
    const contextQuery = [];
    Object.keys(context).forEach(contextKey => {
      if (typeof context[contextKey] === 'boolean') {
        contextQuery.push(`context.${contextKey} is ${formatValue(context[contextKey])}`);
      } else if (typeof context[contextKey] === 'number') {
        contextQuery.push(`context.${contextKey} == ${context[contextKey]}`);
      } else {
        contextQuery.push(`context.${contextKey} == "${context[contextKey]}"`);
      }
    });

    const queryPrefix = this.searchBarRef?.current?.getValue() || null;

    let condition = contextQuery.join(' and ');
    if (!!queryPrefix) {
      condition = `(${queryPrefix}) and ${condition}`;
    }

    const query = !!condition ? `${metricName} if ${condition}` : metricName;
    setItem(USER_LAST_SEARCH_QUERY, query);
    this.setState({
      redirectToPanel: true,
    });
  };

  resetExperiments = () => {
    this.setState({
      selectedExperiments: [],
    });
  };

  resetRuns = () => {
    this.setState({
      selectedRuns: [],
    });
  };

  toggleExperiment = (experimentName) => {
    this.setState(prevState => {
      let { selectedExperiments } = prevState;

      if (selectedExperiments.indexOf(experimentName) === -1) {
        selectedExperiments.push(experimentName);
      } else {
        selectedExperiments = _.remove(selectedExperiments, (v) => v !== experimentName);
      }

      return {
        ...prevState,
        selectedExperiments,
      };
    });
  };

  toggleRun = (experimentName, runHash) => {
    this.setState(prevState => {
      let { selectedRuns } = prevState;

      if (selectedRuns.indexOf(runHash) === -1) {
        selectedRuns.push(runHash);
      } else {
        selectedRuns = _.remove(selectedRuns, (v) => v !== runHash);
      }

      return {
        ...prevState,
        selectedRuns,
      };
    });
  };

  toggleColoring = (prop) => {
    let key = JSON.stringify(prop);
    this.setState(prevState => ({
      coloredCols: {
        ...prevState.coloredCols,
        [key]: !!prevState.coloredCols[key] ? undefined : interpolateColors(
          this.state.runs.map(run => _.get(run, prop))
        )
      }
    }));
  };

  _renderExperiments = () => {
    if (!this.state.experiments || this.state.experiments.length === 0) {
      return null;
    }

    return (
      <div className='HubExperimentsDashboardScreen__experiments__items'>
        <UI.Menu
          bordered
          outline
          headerElem={
            <div className='HubExperimentsDashboardScreen__experiments__header'>
              Experiments
              {!!this.state.selectedExperiments?.length &&
                <UI.Buttons className='HubExperimentsDashboardScreen__experiments__actions'>
                  <UI.Button
                    type='primary'
                    size='small'
                    onClick={() => this.searchExperiments()}
                    iconLeft={
                      <UI.Icon i='search' />
                    }
                  >
                    Search
                  </UI.Button>
                  <UI.Button
                    type='positive'
                    size='small'
                    onClick={() => this.exploreExperiments()}
                    iconLeft={
                      <UI.Icon i='timeline' />
                    }
                  >
                    Explore
                  </UI.Button>
                  <UI.Button type='secondary' size='small' onClick={() => this.resetExperiments()}>Reset</UI.Button>
                </UI.Buttons>
              }
            </div>
          }
        >
          {this.state.experiments.map((exp, i) =>
            <UI.MenuItem
              className='HubExperimentsDashboardScreen__experiments__item'
              key={i}
              onClick={() => this.toggleExperiment(exp)}
              active={this.state.selectedExperiments.indexOf(exp) !== -1}
              activeClass='activeCheck'
            >
              {exp}
            </UI.MenuItem>
          )}
        </UI.Menu>
      </div>
    );
  };

  _renderRuns = () => {
    if (!this.state.runs || this.state.runs.length === 0) {
      return null;
    }

    return (
      <div className='HubExperimentsDashboardScreen__runs__content'>
        <div className='HubExperimentsDashboardScreen__runs__table__wrapper'>
          <UI.Table>
            <thead>
              <tr className='Table__topheader' ref={this.topHeaderRef}>
                <th>
                  <UI.Text overline>&nbsp;</UI.Text>
                </th>
                {
                  Object.keys(this.metricKeys).map(metricName => (
                    <th key={metricName} colSpan={this.metricKeys[metricName].length}>
                      <UI.Text className='Table__topheader__item__name'>{metricName}</UI.Text>
                    </th>
                  ))
                }
                {
                  Object.keys(this.paramKeys).map(paramKey => (
                    <th key={paramKey} colSpan={this.paramKeys[paramKey].length}>
                      <UI.Text className='Table__topheader__item__name'>{paramKey}</UI.Text>
                    </th>
                  ))
                }
              </tr>
              <tr className='Table__subheader'>
                <th style={{ top: this.state.subheaderTop }}>
                  <div className='Table__subheader__item'>
                    {!!this.state.selectedRuns?.length
                      ? (
                        <UI.Buttons className=''>
                          <UI.Button
                            type='positive'
                            size='small'
                            onClick={() => this.exploreRuns()}
                            iconLeft={
                              <UI.Icon i='timeline' />
                            }
                          >
                            Explore
                          </UI.Button>
                          <UI.Button type='secondary' size='small' onClick={() => this.resetRuns()}>Reset</UI.Button>
                        </UI.Buttons>
                      ) : (
                        <>Runs</>
                      )
                    }
                  </div>
                </th>
                {
                  Object.keys(this.metricKeys).map((metricName, metricKey) => this.metricKeys[metricName].map((metricContext, contextKey) => (
                    <th key={`${metricKey}-${contextKey}`} style={{ top: this.state.subheaderTop }}>
                      <div className='Table__subheader__item'>
                        <div className='HubExperimentsDashboardScreen__runs__context__cell'>
                          {!!metricContext && Object.keys(metricContext).map(metricContextKey =>
                            <UI.Label
                              key={metricContextKey}
                              size='small'
                              className='HubExperimentsDashboardScreen__runs__context__item'
                            >
                              {metricContextKey}: {formatValue(metricContext[metricContextKey])}
                            </UI.Label>
                          )}
                          {(metricContext === null || Object.keys(metricContext).length === 0) &&
                            <UI.Label
                              key={0}
                              size='small'
                              className='HubExperimentsDashboardScreen__runs__context__item'
                            >
                              No context
                            </UI.Label>
                          }
                          <div
                            className='Table__header__action'
                            onClick={() => this.exploreMetric(metricName, metricContext)}
                          >
                            <UI.Icon
                              i='timeline'
                              scale={1.2}
                              className='HubExperimentsDashboardScreen__runs__context__icon'
                            />
                          </div>
                          <div
                            className='Table__header__action'
                            onClick={evt => this.toggleColoring(['params', '__METRICS__', metricName, contextKey, 'values', 'last'])}
                          >
                            <UI.Icon
                              i='filter_list'
                              className={classNames({
                                'Table__header__action__icon': true,
                                active: !!this.state.coloredCols[JSON.stringify(['params', '__METRICS__', metricName, contextKey, 'values', 'last'])]
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    </th>
                  )))
                }
                {
                  Object.keys(this.paramKeys).map(paramKey => this.paramKeys[paramKey].map((key, index) => (
                    <th key={`${paramKey}-${key}`} style={{ top: this.state.subheaderTop }}>
                      <div className='Table__subheader__item'>
                        <UI.Text className='Table__subheader__item__name'>{key}</UI.Text>
                        <div
                          className='Table__header__action'
                          onClick={evt => this.toggleColoring(['params', paramKey, key])}
                        >
                          <UI.Icon
                            i='filter_list'
                            className={classNames({
                              'Table__header__action__icon': true,
                              active: !!this.state.coloredCols[JSON.stringify(['params', paramKey, key])]
                            })}
                          />
                        </div>
                      </div>
                    </th>
                  )))
                }
              </tr>
            </thead>
            <tbody>
              {this.state.runs.map((run, i) =>
                <tr
                  className='HubExperimentsDashboardScreen__runs__item Table__item' 
                  key={i}
                >
                  <td
                    className={classNames({
                      HubExperimentsDashboardScreen__runs__item__cell: true,
                      active: this.state.selectedRuns.indexOf(run.run_hash) !== -1,
                    })}
                    onClick={() => this.toggleRun(run.experiment_name, run.run_hash)}
                  >
                    <Link
                      to={buildUrl(HUB_PROJECT_EXPERIMENT, {
                        experiment_name: run.experiment_name,
                        commit_id: run.run_hash,
                      })}
                    >
                      <UI.Text
                        className='HubExperimentsDashboardScreen__runs__item__name'
                      >
                        {run.experiment_name} | {moment(run.date * 1000).format('HH:mm · D MMM, YY')}
                      </UI.Text>
                    </Link>
                  </td>
                  {
                    Object.keys(this.metricKeys).map((metricName, metricKey) => this.metricKeys[metricName].map((metricContext, contextKey) => {
                      let metricValue = this.getMetricValue(run, metricName, metricContext)
                      let color = this.state.coloredCols[JSON.stringify(['params', '__METRICS__', metricName, contextKey, 'values', 'last'])]?.[metricValue];
                      return (
                        <td
                          key={`${metricKey}-${contextKey}`}
                          style={{
                            backgroundColor: color,
                            color: !!color && Color(color).isDark() ? '#FFF' : 'var(--grey)'
                          }}
                        >
                          {formatValue(typeof metricValue === 'number' ? roundValue(metricValue) : undefined, true)}
                        </td>
                      );
                    }))
                  }
                  {
                    Object.keys(this.paramKeys).map(paramKey => this.paramKeys[paramKey].map(key => {
                      let color = this.state.coloredCols[JSON.stringify(['params', paramKey, key])]?.[run.params?.[paramKey]?.[key]];
                      return (
                        <td 
                          key={`${paramKey}-${key}`}
                          style={{
                            backgroundColor: color,
                            color: (!!color && Color(color).isDark() ? '#FFF' : 'var(--grey)'),
                          }}
                        >
                          {formatValue(run.params?.[paramKey]?.[key], true)}
                        </td>
                      );
                    }))
                  }
                </tr>
              )}
            </tbody>
          </UI.Table>
        </div>
      </div>
    );
  };

  getMetricValue = (run, metricName, metricContext) => {
    const metric = run.params?.['__METRICS__']?.[metricName];

    if (metric === undefined || metric === null) {
      return metric;
    }

    let value = null;
    metric.forEach(metricContextItem => {
      const contextDict = {};
      if (metricContextItem.context !== null) {
        metricContextItem.context.forEach(contextItem => {
          contextDict[contextItem[0]] = contextItem[1];
        });
      }
      if (deepEqual(contextDict, metricContext)) {
        value = metricContextItem.values.last;
      }
    });

    return value;
  };

  _renderContent = () => {
    return (
      <div className='HubExperimentsDashboardScreen' style={{ height: this.state.height }}>
        <div className='HubExperimentsDashboardScreen__nav'>
          <SearchBar
            ref={this.searchBarRef}
            // initValue={this.state.context.search.query}
            placeholder={'e.g. `experiment in (nmt_syntok_dynamic, nmt_syntok_greedy) and hparams.lr >= 0.0001`'}
            onSubmit={(value) => this.handleSearchBarSubmit(value)}
            onClear={(value) => this.handleSearchBarSubmit(value)}
          />
        </div>
        {this.state.isLoading
          ? <UI.Text className='' type='grey' center spacingTop>Loading..</UI.Text>
          : (this.state.runs.length
            ? (
              <div className='HubExperimentsDashboardScreen__content'>
                <div className='HubExperimentsDashboardScreen__experiments'>
                  {this._renderExperiments()}
                </div>
                <div className='HubExperimentsDashboardScreen__runs'>
                  {this._renderRuns()}
                </div>
              </div>
            )
            : (
              <>
                {!!this.searchBarRef?.current?.getValue()
                  ? <UI.Text type='grey' center spacingTop>You haven't recorded experiments matching this query.</UI.Text>
                  : <UI.Text type='grey' center spacingTop>It's super easy to search Aim experiments.</UI.Text>
                }
                <UI.Text type='grey' center>
                  Lookup
                  {' '}
                  <a
                    className='link'
                    href='https://github.com/aimhubio/aim#searching-experiments'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    search docs
                  </a>
                  {' '}
                  to learn more.
                </UI.Text>
              </>
            )
          )
        }
      </div>
    );
  };

  render() {
    if (this.state.redirectToPanel) {
      return <Redirect to={EXPLORE} push />
    }

    return (
      <ProjectWrapper
        size='fluid'
        gap={false}
        ref={this.projectWrapperRef}
      >
        <Helmet>
          <meta title='' content='' />
        </Helmet>

        <>
          {this._renderContent()}
        </>
      </ProjectWrapper>
    )
  }
}

export default withRouter(storeUtils.getWithState(
  classes.HUB_PROJECT_EXPERIMENTS_DASHBOARD_SCREEN,
  HubExperimentsDashboardScreen
));