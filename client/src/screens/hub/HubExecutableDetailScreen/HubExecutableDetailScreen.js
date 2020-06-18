import './HubExecutableDetailScreen.less';

import React from 'react';
import { Link, Redirect } from 'react-router-dom';

import UI from '../../../ui';
import * as classes from '../../../constants/classes';
import * as screens from '../../../constants/screens';
import HubWrapper from '../../../wrappers/hub/HubWrapper/HubWrapper';
import * as storeUtils from '../../../storeUtils';
import ExecutableViewForm from '../../../components/hub/ExecutableViewForm/ExecutableViewForm';
import ProjectWrapper from '../../../wrappers/hub/ProjectWrapper/ProjectWrapper';
import { buildUrl } from '../../../utils';


class HubExecutableDetailScreen extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      activeTab: 'processes',
      executableParams: {},
      processes: [],
      saveBtn: {
        loading: false,
        disabled: false,
      },
      executeBtn: {
        loading: false,
        disabled: false,
      },
    };

    this.form = React.createRef();
  }

  componentDidMount() {
    this.getExecutable();
  }

  getExecutable = () => {
    this.setState(prevState => ({
      ...prevState,
      isLoading: true,
    }));

    const execID = this.props.match.params.executable_id;
    this.props.getExecutable(execID).then((data) => {
      this.setState(prevState => ({
        ...prevState,
        executableParams: {
          name: data.name,
          scriptPath: data.script_path,
          parameter: data.arguments,
          environmentVariable: data.env_vars,
          interpreterPath: data.interpreter_path,
          workingDir: data.working_dir,
          aimExperiment: data.aim_experiment,
        },
        processes: data.processes,
      }));
    }).finally(() => {
      this.setState(prevState => ({
        ...prevState,
        isLoading: false,
      }));
    });
  };

  handleSaveBtnClick = () => {
    if (!this.form) {
      return;
    }
    const form = this.form.current.getForm();

    this.setState({
      saveBtn: {
        loading: true,
        disabled: true,
      }
    });

    const execID = this.props.match.params.executable_id;
    this.props.saveExecutable(execID, {
      name: form.name,
      script_path: form.scriptPath,
      arguments: form.parameter,
      env_vars: form.environmentVariable,
      interpreter_path: form.interpreterPath,
      working_dir: form.workingDir,
      aim_experiment: form.aimExperiment,
    }).then((data) => {
      this.getExecutable();
    }).catch((err) => {
    }).finally(() => {
      this.setState(prevState => ({
        ...prevState,
        saveBtn: {
          loading: false,
          disabled: false,
        }
      }));
    });
  };

  handleExecuteBtnClick = () => {
    if (!this.form) {
      return;
    }
    const form = this.form.current.getForm();

    this.setState(prevState => ({
      ...prevState,
      executeBtn: {
        ...prevState.executeBtn,
        loading: true,
        disabled: true,
      },
    }));

    const execID = this.props.match.params.executable_id;
    this.props.executeExecutableForm(execID, {
      name: form.name,
      script_path: form.scriptPath,
      arguments: form.parameter,
      env_vars: form.environmentVariable,
      interpreter_path: form.interpreterPath,
      working_dir: form.workingDir,
      aim_experiment: form.aimExperiment,
    }).then(() => {
      this.getExecutable();
      this.setState(prevState => ({
        ...prevState,
        activeTab: 'processes',
      }));
    }).finally(() => {
      this.setState(prevState => ({
        ...prevState,
        executeBtn: {
          ...prevState.executeBtn,
          loading: false,
          disabled: false,
        },
      }));
    });
  };

  _renderSettings = () => {
    return (
      <>
        <ExecutableViewForm
          ref={this.form}
          {...this.state.executableParams}
        />
        <UI.Buttons>
          <UI.Button
            onClick={() => this.handleSaveBtnClick()}
            type='primary'
            {...this.state.saveBtn}
          >
            Save
          </UI.Button>
        </UI.Buttons>
      </>
    );
  };

  _renderExecForm = () => {
    return (
      <>
        <UI.Text left spacingTop>
          <UI.Button
            onClick={() => this.handleExecuteBtnClick()}
            type='positive'
            inline
            {...this.state.executeBtn}
          >
            Execute now
          </UI.Button>
        </UI.Text>
        <UI.Line />
        <ExecutableViewForm
          ref={this.form}
          {...this.state.executableParams}
          processForm
        />
      </>
    );
  };

  _renderProcesses = () => {
    return (
      <div className='HubExecutableDetailScreen__processes'>
        {!!this.state.processes &&
          <UI.List>
            {this.state.processes.map((p, pKey) =>
              <UI.ListItem key={pKey} className='HubExecutableDetailScreen__processes__item'>
                <Link to={buildUrl(screens.HUB_PROJECT_EXECUTABLE_PROCESS_DETAIL, {
                  process_id: p.id,
                })}>
                  PID: {p.pid}
                </Link>
                {!!p.arguments &&
                  <UI.Text type='grey' small>Arguments: {p.arguments}</UI.Text>
                }
                {!!p.env_vars &&
                  <UI.Text type='grey' small>Environment variables: {p.env_vars}</UI.Text>
                }
              </UI.ListItem>
            )}
          </UI.List>
        }
        {(!this.state.processes || this.state.processes.length === 0) &&
          <UI.Text type='grey' center>Empty</UI.Text>
        }
      </div>
    );
  };

  _renderContent = () => {
    if (this.state.isLoading) {
      return <UI.Text type='grey' center>Loading..</UI.Text>;
    }

    return (
      <div className='HubExecutableDetailScreen__FormGroup__wrapper'>
        <UI.Text className='HubExecutableDetailScreen__name' size={6} header spacing>
          <Link to={buildUrl(screens.HUB_PROJECT_EXECUTABLES, {})}>
            Processes
          </Link>
          <UI.Text type='grey' inline> / {this.state.executableParams.name}</UI.Text>
        </UI.Text>
        <UI.Tabs
          leftItems={
            <>
              <UI.Tab
                className=''
                active={this.state.activeTab === 'processes'}
                onClick={() => this.setState({ activeTab: 'processes' })}
              >
                History
              </UI.Tab>
              <UI.Tab
                className=''
                active={this.state.activeTab === 'new_process'}
                onClick={() => this.setState({ activeTab: 'new_process' })}
              >
                Execute
              </UI.Tab>
              <UI.Tab
                className=''
                active={this.state.activeTab === 'settings'}
                onClick={() => this.setState({ activeTab: 'settings' })}
              >
                Template
              </UI.Tab>
            </>
          }
        />
        <div>
          {this.state.activeTab === 'processes' && this._renderProcesses()}
          {this.state.activeTab === 'new_process' && this._renderExecForm()}
          {this.state.activeTab === 'settings' && this._renderSettings()}
        </div>
      </div>
    );
  };

  render() {
    return (
      <ProjectWrapper>
        <UI.Container size='small' ref={this.contentRef}>
          {this._renderContent()}
        </UI.Container>
      </ProjectWrapper>
    );
  }
}

export default storeUtils.getWithState(
  classes.HUB_PROJECT_EXECUTABLE_DETAIL,
  HubExecutableDetailScreen
);
