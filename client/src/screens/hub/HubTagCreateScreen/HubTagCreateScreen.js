import './HubTagCreateScreen.less';

import React from 'react';
import { Link, Redirect } from 'react-router-dom';

import UI from '../../../ui';
import * as classes from '../../../constants/classes';
import * as screens from '../../../constants/screens';
import HubWrapper from '../../../wrappers/hub/HubWrapper/HubWrapper';
import * as storeUtils from '../../../storeUtils';
import { classNames } from '../../../utils';


class HubTagCreateScreen extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      redirectMain: false,
      createBtn: {
        loading: false,
        disabled: false,
      },
      form: {
        name: '',
        color: '',
      },
    };

    this.colors = [
      '#16A085',
      '#27AE60',
      '#2980B9',
      '#8E44AD',
      '#E67E22',
      '#F1C40F',
      '#E74C3C',
      '#B33771',
      '#BDC581',
      '#FD7272',
      '#546de5',
      '#574b90',
    ];
  }

  handleInputChange = (e, callback=null) => {
    const value = e.target.value;
    const name = e.target.name;
    this.setState((prevState) => ({
      ...prevState,
      form: {
        ...prevState.form,
        [name]: value,
      },
    }), () => {
      if (callback) {
        callback(e);
      }
    });
  };

  handleColorClick = (color) => {
    this.setState((prevState) => ({
      ...prevState,
      form: {
        ...prevState.form,
        color,
      },
    }));
  };

  handleCreateBtnClick = () => {
    this.setState({
      createBtn: {
        loading: true,
        disabled: true,
      }
    });

    this.props.postNewTag({
      name: this.state.form.name,
      color: this.state.form.color,
    }).then((data) => {
      this.setState(prevState => ({
        ...prevState,
        redirectMain: true,
      }));
    }).catch((err) => {
    }).finally(() => {
      this.setState(prevState => ({
        ...prevState,
        createBtn: {
          loading: false,
          disabled: false,
        }
      }));
    });
  };

  _renderContent = () => {
    return (
      <div className='HubTagCreateScreen__FormGroup__wrapper'>
        <UI.Text size={4} header divided> Create New Tag </UI.Text>
        <div className='HubTagCreateScreen__FormGroup'>
          <UI.Input
            onChange={this.handleInputChange}
            name='name'
            value={this.state.form.name}
            label='Tag Name'
            placeholder={'best-cnn'}
          />
          <div className=''>
            <UI.Input
              onChange={this.handleInputChange}
              name='color'
              value={this.state.form.color}
              label='Tag Color'
              placeholder={'red'}
            />
            <div className='HubTagCreateScreen__colors'>
              {this.colors.map((color, cKey) =>
                <UI.Label
                  className={classNames({
                    HubTagCreateScreen__colors__item: true,
                    active: this.state.form.color === color,
                  })}
                  color={color}
                  key={cKey}
                  onClick={() => this.handleColorClick(color)}
                >
                  {color}
                </UI.Label>
              )}
            </div>
            <UI.Line />
          </div>
        </div>
        <UI.Buttons>
          <UI.Button
            onClick={() => this.handleCreateBtnClick()}
            type='positive'
            {...this.state.createBtn}
          >
            Create
          </UI.Button>
          <Link to={screens.HUB_PROJECT_TAGS}>
            <UI.Button type='secondary'> Cancel </UI.Button>
          </Link>
        </UI.Buttons>
      </div>
    );
  };

  render() {
    if (this.state.redirectMain) {
      return <Redirect to={screens.HUB_PROJECT_TAGS} />
    }

    return (
      <HubWrapper>
        <UI.Container size='small' ref={this.contentRef}>
          {this._renderContent()}
        </UI.Container>
      </HubWrapper>
    );
  }
}

export default storeUtils.getWithState(
  classes.HUB_PROJECT_CREATE_TAG,
  HubTagCreateScreen
);
