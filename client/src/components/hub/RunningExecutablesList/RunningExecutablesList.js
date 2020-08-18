import './RunningExecutablesList.less';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import UI from '../../../ui';
import * as storeUtils from '../../../storeUtils';
import * as classes from '../../../constants/classes';


class RunningExecutablesList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      executables: [],
      pollData: [],
      killButtons: [],
    };
  }

  componentDidMount() {
    this.getProcesses();
    this.pollExecutablesInfo();
  }

  pollExecutablesInfo = () => {
    this.datapolling = setInterval(() => {
      this.props.pollExecutablesInfo().then((data) => {
        console.log(data)
        this.setState({
          pollData: [...this.state.pollData, data]
        })
      })
    }, 5000)
  }

  componentWillUnmount() {
    clearInterval(this.datapolling);
  }

  getProcesses = () => {
    this.setState({
      isLoading: true,
    });

    this.props.getRunningExecutables().then((data) => {
      this.setState({
        isLoading: false,
        executables: data,
        killButtons: data.map(i => ({
          loading: false,
          disabled: false,
        })),
      });
    });
  };

  handleProcessKill = (idx, pid) => {
    this.setState(prevState => {
      let { killButtons } = prevState;
      killButtons[idx] = {
        loading: true,
        disabled: true,
      };
      return {
        ...prevState,
        killButtons,
      };
    });

    this.props.killRunningExecutable(pid).then((data) => {
      this.getProcesses();
    });
  };

  render() {
    return (
      <div>
        {this.state.isLoading
          ? <UI.Text className='RunningExecutablesList__status' type='grey' center>Loading..</UI.Text>
          : (!this.state.executables.length
            ? <UI.Text className='RunningExecutablesList__status' type='grey' center>Empty</UI.Text>
            : (
              <div className='RunningExecutablesList__items'>
                {this.state.executables.map((e, eKey) =>
                  <div className='RunningExecutablesList__item__wrapper' key={eKey}>
                    <div className='RunningExecutablesList__item'> 
                      <UI.Button
                        onClick={() => this.handleProcessKill(eKey, e.pid)}
                        type='negative'
                        size='small'
                        inline
                        {...this.state.killButtons[eKey]}
                      >
                        Kill
                      </UI.Button>
                      <UI.Label>{e.pid}</UI.Label>
                      <div className='RunningExecutablesList__item__name'>
                        {!!e.name &&
                          <UI.Text inline>{e.name}:</UI.Text>
                        }
                        <UI.Text small inline> > {e.script_path}</UI.Text>
                      </div>
                    </div>
                    <UI.Label className='RunningExecutablesList__item__left'> Epoch: 5 </UI.Label>
                  </div>
                )}
              </div>
            )
          )
        }
      </div>
    );
  }
}

RunningExecutablesList.propTypes = {};

export default storeUtils.getWithState(
  classes.RUNNING_EXEC_LIST,
  RunningExecutablesList
);