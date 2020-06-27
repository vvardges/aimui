import './HubTagDetailScreen.less';

import React from 'react';
import { Helmet } from 'react-helmet';
import { Redirect, Link } from 'react-router-dom';
import moment from 'moment';

import { buildUrl } from '../../../utils';

import TagSettingForm from '../../../components/hub/TagSettingForm/TagSettingForm';
import ProjectWrapper from '../../../wrappers/hub/ProjectWrapper/ProjectWrapper';
import UI from '../../../ui';
import * as storeUtils from '../../../storeUtils';
import * as classes from '../../../constants/classes';
import * as screens from '../../../constants/screens';

class HubTagDetailScreen extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      activeTab: 'overview',
      isLoading: true,
      tag: null,
      relatedRuns: [],
      form: {
        name: '',
        color: '',
      },
      actualFormValues: {
        name: '',
        color: '',
      },
      saveButtonStatus: {
        loading: false,
        disabled: false,
      },
      cancelButtonStatus: {
        disabled: true,
      },
    };

    this.form = React.createRef();
  }

  componentDidMount() {
    this.getTag(this.props.match.params.tag_id);
    this.getRelatedRuns(this.props.match.params.tag_id);
  }

  getTag = (tag_id) => {
    this.setState((prevState) => ({
      ...prevState,
      isLoading: true,
    }));

    this.props.getTag(tag_id).then((tag) => {
      this.setState({
        tag: tag,
        form: {
          name: tag.name,
          color: tag.color,
        },
        actualFormValues: {
          name: tag.name,
          color: tag.color,
        }
      })
    }).finally(() => {
      this.setState((prevState) => ({
        ...prevState,
        isLoading: false,
      }));
    });
  };

  getRelatedRuns = (tag_id) => {
    this.props.getRelatedRuns(tag_id).then((data) => {
      this.setState({
        relatedRuns: data.data,
      });
    });
  };

  handleFormUpdate = () => {
    const form = this.form.current.getForm();
    const { actualFormValues } = this.state;

    if (form.name !== actualFormValues.name || form.color !== actualFormValues.color) {
      this.setState({
        cancelButtonStatus: {
          disabled: false,
        },
      });
    } else {
      this.setState({
        cancelButtonStatus: {
          disabled: true,
        },
      });
    }
  };

  handleSaveButtonClick = () => {
    this.setState({
      saveButtonStatus: {
        loading: true,
        disabled: true,
      },
    });

    const form = this.form.current.getForm();

    this.props.updateTag(form)
      .then((data) => {
        this.setState({
          actualFormValues: {
            name: form.name,
            color: form.color,
          },
          tag: {
            name: form.name,
            color: form.color,
          },
          cancelButtonStatus: {
            disabled: true,
          },
        });
      })
      .catch((err) => {})
      .finally(() => {
        this.setState((prevState) => ({
          ...prevState,
          saveButtonStatus: {
            loading: false,
            disabled: false,
          },
        }));
      });
  };

  handleCancelButtonClick = () => {
    const { actualFormValues } = this.state;

    this.form.current.setForm(actualFormValues.name, actualFormValues.color);

    this.setState({
      cancelButtonStatus: {
        disabled: true,
      },
    });
  };

  _renderOverview = () => {
    return (
      <div>
        <div className='HubTagDetailScreen__items'>
          {this.state.relatedRuns.map((run) => (
            <div className='HubTagDetailScreen__item' key={run.hash}>
              <Link
                to={buildUrl(screens.HUB_PROJECT_EXPERIMENT, {
                  experiment_name: run.experiment_name,
                  commit_id: run.hash,
                })}
              >
                <UI.Text>
                  {run.experiment_name} / {run.hash}
                </UI.Text>
              </Link>
              <UI.Text type='grey' small>
                Created at {moment(run.created_at).format('HH:mm · D MMM, YY')}
              </UI.Text>
            </div>
          ))}
          {!this.state.relatedRuns.length &&
            <UI.Text type='grey' spacingTop center>Empty</UI.Text>
          }
        </div>
      </div>
    );
  };

  _renderSettings = () => {
    return (
      <>
        <TagSettingForm
          name={this.state.form.name}
          color={this.state.form.color}
          tag_id={this.props.match.params.tag_id}
          onUpdate={() => this.handleFormUpdate()}
          ref={this.form}
        />
        <UI.Line />
        <UI.Buttons>
          <UI.Button
            onClick={() => this.handleSaveButtonClick()}
            type='primary'
            {...this.state.saveButtonStatus}
          >
            Save
          </UI.Button>
          <UI.Button
            onClick={() => this.handleCancelButtonClick()}
            type='secondary'
            {...this.state.cancelButtonStatus}
          >
            Cancel
          </UI.Button>
        </UI.Buttons>
      </>
    );
  };

  _renderContent = () => {
    if (this.state.isLoading) {
      return (
        <UI.Text type='grey' center>
          Loading..
        </UI.Text>
      );
    }

    return (
      <>
        <UI.Text
          size={6}
          header
          spacing
        >
          <Link to={screens.HUB_PROJECT_TAGS}> Tags </Link>
          <UI.Text type='grey' inline> / </UI.Text>
          <UI.Text color={this.state.tag.color} inline>
            {this.state.tag.name}
          </UI.Text>
        </UI.Text>
        <UI.Tabs
          leftItems={
            <>
              <UI.Tab
                className=''
                active={this.state.activeTab === 'overview'}
                onClick={() => this.setState({ activeTab: 'overview' })}
              >
                Related runs
              </UI.Tab>
              <UI.Tab
                className=''
                active={this.state.activeTab === 'settings'}
                onClick={() => this.setState({ activeTab: 'settings' })}
              >
                Settings
              </UI.Tab>
            </>
          }
        />
        <div>
          {this.state.activeTab === 'overview' && this._renderOverview()}
          {this.state.activeTab === 'settings' && this._renderSettings()}
        </div>
      </>
    );
  };

  render() {
    return (
      <ProjectWrapper>
        <Helmet>
          <meta title='' content='' />
        </Helmet>

        <UI.Container size='small' ref={this.contentRef}>
          {this._renderContent()}
        </UI.Container>
      </ProjectWrapper>
    );
  }
}

export default storeUtils.getWithState(
  classes.HUB_PROJECT_EDIT_TAG,
  HubTagDetailScreen
);