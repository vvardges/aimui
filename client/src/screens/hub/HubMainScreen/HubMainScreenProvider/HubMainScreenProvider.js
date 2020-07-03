import React, { Component } from 'react';

import HubMainScreenContext from '../HubMainScreenContext/HubMainScreenContext';
import * as storeUtils from '../../../../storeUtils';
import * as classes from '../../../../constants/classes';
import PropTypes from 'prop-types';


class HubMainScreenProvider extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      data: [],
      contextStepIndex: null,
      contextActiveStepIndex: null,
    };
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (JSON.stringify(prevState.data) !== JSON.stringify(this.state.data)) {
      this.props.dataDidUpdate();
    }
  }

  getDataByQuery = (query) => {
    this.setState(prevState => ({
      ...prevState,
      isLoading: true,
    }));

    this.props.getCommitsByQuery(query).then((data) => {
      this.setState(prevState => ({
        ...prevState,
        data: Object.values(data),
      }));
    }).finally(() => {
      this.setState(prevState => ({
        ...prevState,
        isLoading: false,
      }));
    });
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

  setContextStepIndex = (contextStepIndex) => {
    this.setState({ contextStepIndex });
  };

  setContextActiveStepIndex = (contextActiveStepIndex) => {
    this.setState({ contextActiveStepIndex });
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
          setContextStepIndex: this.setContextStepIndex,
          setContextActiveStepIndex: this.setContextActiveStepIndex,
        }}
      >
        {this.props.children}
      </HubMainScreenContext.Provider>
    );
  }
}

HubMainScreenProvider.defaultProps = {
  dataDidUpdate: () => {},
};

HubMainScreenProvider.propTypes = {
  dataDidUpdate: PropTypes.func,
};

export default storeUtils.getWithState(
  classes.HUB_MAIN_SCREEN_PROVIDER,
  HubMainScreenProvider
);