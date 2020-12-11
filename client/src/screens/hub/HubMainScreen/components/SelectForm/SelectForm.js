import './SelectForm.less';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';

import SidebarMenu from './components/SidebarMenu/SidebarMenu';
import SelectInput from './components/SelectInput/SelectInput';
import HubMainScreenContext from '../../HubMainScreenContext/HubMainScreenContext';
import UI from '../../../../../ui';
import { classNames } from '../../../../../utils';

class SelectForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      searchActionActive: false,
    };
  }

  getFullQuery = () => {
    let query = this.context.searchInput.selectInput;
    if (!!this.context.searchInput.selectConditionInput) {
      query = `${query} if ${this.context.searchInput.selectConditionInput}`;
    }
    return query;
  };

  search = () => {
    this.setState({ searchActionActive: true });
    const query = this.getFullQuery();

    this.context.setSearchState(
      {
        query,
      },
      () => {
        this.context
          .searchByQuery(false)
          .then(() => this.setState({ searchActionActive: false }));
      },
      true,
      true,
      false,
    );
  };

  render() {
    return (
      <div className="SelectForm">
        <div className="SelectForm__body">
          <div className="SelectForm__form">
            <div className="SelectForm__form__row">
              <div className="SelectForm__form__row__title">Select</div>
              <SelectInput search={() => this.search()} />
            </div>
            <div className="SelectForm__form__row">
              <div className="SelectForm__form__row__title">If</div>
              <UI.Input
                className="SelectForm__form__row__input"
                classNameWrapper="SelectForm__form__row__input__wrapper"
                placeholder="e.g. `experiment in (nmt_syntok_dynamic, nmt_syntok_greedy) and hparams.lr >= 0.0001`"
                onChange={(evt) =>
                  this.context.setSearchInputState({
                    selectConditionInput: evt.target.value,
                  })
                }
                value={this.context.searchInput.selectConditionInput}
                tabIndex={2}
                onKeyPress={(evt) => {
                  if (evt.charCode === 13) {
                    this.search();
                  }
                }}
              />
            </div>
          </div>
          <div className="SelectForm__actions">
            <div className="SelectForm__action__wrapper">
              <div
                className={classNames({
                  SelectForm__action: true,
                  active: this.context.runs.isLoading,
                  disabled: this.context.runs.isLoading,
                })}
                onClick={() => this.search()}
              >
                <UI.Icon i="search" />
              </div>
            </div>
            <div className="SelectForm__action__wrapper">
              <SidebarMenu className="SelectForm__action" />
            </div>
            <div className="SelectForm__action__wrapper">
              <div
                className={classNames({
                  SelectForm__action: true,
                  disabled: this.context.runs.isLoading,
                })}
                onClick={(evt) => this.props.history.goBack()}
              >
                <UI.Icon i="arrow_back_ios_new" />
              </div>
            </div>
            <div className="SelectForm__action__wrapper">
              <div
                className={classNames({
                  SelectForm__action: true,
                  disabled: this.context.runs.isLoading,
                })}
                onClick={(evt) => this.props.history.goForward()}
              >
                <UI.Icon i="arrow_forward_ios" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

SelectForm.propTypes = {};

SelectForm.contextType = HubMainScreenContext;

export default withRouter(SelectForm);
