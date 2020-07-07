import React, { Component } from 'react';

import HubMainScreenContext from '../HubMainScreenContext/HubMainScreenContext';
import * as storeUtils from '../../../../storeUtils';
import * as classes from '../../../../constants/classes';
import { randomStr, sortOnKeys } from '../../../../utils';
import PropTypes from 'prop-types';


class HubMainScreenProvider extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      isLoadingContext: false,
      data: [],
      dataSnapshotUniqueKey: null,
      contextInformation: {
        unionNamespaces: [],
        unionFields: {},
        data: {},
      },
      contextStepIndex: null,
      contextActiveStepIndex: null,
      contextActiveStepHash: null,
      settings: {
        yScale: 0,
      },
    };
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevState.dataSnapshotUniqueKey !== this.state.dataSnapshotUniqueKey) {
      this.props.dataDidUpdate();
    }
  }

  getDataByQuery = (query) => {
    this.setState(prevState => ({
      ...prevState,
      isLoading: true,
      isLoadingContext: true,
    }));

    this.props.getCommitsMetricsByQuery(query).then((data) => {
      this.setState(prevState => ({
        ...prevState,
        data: Object.values(data),
        dataSnapshotUniqueKey: randomStr(16),
      }));
    }).finally(() => {
      this.setState(prevState => ({
        ...prevState,
        isLoading: false,
      }));
    });

    this.props.getCommitsDictionariesByQuery(query).then((runsData) => {
      let unionNamespaces = [];
      let unionFields = {};

      for (let i in runsData) {
        if (!!runsData[i].data && Object.keys(runsData[i].data).length) {
          unionNamespaces = unionNamespaces.concat(...Object.keys(runsData[i].data));
        }
      }
      unionNamespaces = Array.from(new Set(unionNamespaces));

      if (unionNamespaces.length) {
        for (let n in unionNamespaces) {
          unionFields[unionNamespaces[n]] = [];
        }
        for (let i in runsData) {
          Object.keys(runsData[i].data).forEach(n => {
            unionFields[n] = unionFields[n].concat(...Object.keys(runsData[i].data[n]));
          });
        }
        for (let n in unionNamespaces) {
          unionFields[unionNamespaces[n]] = Array.from(new Set(unionFields[unionNamespaces[n]])).sort();
        }
      }

      unionFields = sortOnKeys(unionFields);

      this.setState(prevState => ({
        ...prevState,
        contextInformation: {
          unionNamespaces,
          unionFields,
          data: runsData,
        },
      }));
    }).finally(() => {
      this.setState(prevState => ({
        ...prevState,
        isLoadingContext: false,
      }));
    });
  };

  getLineDataByHash = (lineHash) => {
    for (let i in this.state.data) {
      if (this.state.data[i].hash === lineHash) {
        return this.state.data[i];
      }
    }
    return null;
  };

  getLineValueByStep = (data, step) => {
    const item = this.getLineDataByStep(data, step);
    return item ? item.value : null;
  };

  getLineDataByStep = (data, step) => {
    for (let i = 0; i < data.length; i++) {
      if (data[i].step === step) {
        return data[i];
      } else if (data[i].step > step) {
        return null;
      }
    }

    return null;
  };

  getLineColor = (lineData, alpha=1) => {
    if (lineData.color) {
      return lineData.color;
    }

    const index = lineData.hash.split('').map((c, i) => lineData.hash.charCodeAt(i)).reduce((a, b) => a + b);
    const r = 50;
    const g = ( index * 27 ) % 255;
    const b = ( index * 13 ) % 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  setSettings = (key, value, rerender=false) => {
    this.setState(prevState => ({
      ...prevState,
      settings: {
        ...prevState.settings,
        [key]: value,
      },
    }), () => {
      if (rerender) {
        this.setState(prevState => ({
          ...prevState,
          contextStepIndex: null,
          contextActiveStepIndex: null,
        }), () => this.props.settingsDidUpdate());
      }
    });
  };

  render() {
    return (
      <HubMainScreenContext.Provider
        value={{
          ...this.state,
          getDataByQuery: this.getDataByQuery,
          getLineValueByStep: this.getLineValueByStep,
          getLineDataByStep: this.getLineDataByStep,
          getLineColor: this.getLineColor,
          setContextStepIndex: (contextStepIndex) => this.setState({ contextStepIndex }),
          setContextActiveStepIndex: (contextActiveStepIndex) => this.setState({ contextActiveStepIndex }),
          setContextActiveStepHash: (contextActiveStepHash) => this.setState({ contextActiveStepHash }),
          setSettings: this.setSettings,
          getLineDataByHash: this.getLineDataByHash,
        }}
      >
        {this.props.children}
      </HubMainScreenContext.Provider>
    );
  }
}

HubMainScreenProvider.defaultProps = {
  dataDidUpdate: () => {},
  settingsDidUpdate: () => {},
};

HubMainScreenProvider.propTypes = {
  dataDidUpdate: PropTypes.func,
  settingsDidUpdate: PropTypes.func,
};

export default storeUtils.getWithState(
  classes.HUB_MAIN_SCREEN_PROVIDER,
  HubMainScreenProvider
);