import './SearchBar.less';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import UI from '../../../../../ui';
import * as storeUtils from '../../../../../storeUtils';
import * as classes from '../../../../../constants/classes';
import HubMainScreenContext from '../../HubMainScreenContext/HubMainScreenContext';


class SearchBar extends Component {
  constructor(props) {
    super(props);

    this.state = {
      prevQuery: '',
    };
  }

  handleKeyPress = (evt) => {
    if (evt.charCode === 13) {
      this.search();
      return false;
    }
  };

  handleClearButtonClick = () => {
    this.context.setSearchInputValue('', () => this.search());
  };

  search = () => {
    this.context.setSearchState({ query: this.context.searchInput.value }, () => {
      this.context.searchByQuery().then(() => {
      });
    });
  };

  render() {
    return (
      <div className='SearchBar'>
        <div className='SearchBar__search'>
          <UI.Icon i='nc-zoom-2' className='SearchBar__search__icon' />
          <UI.Input
            className='SearchBar__search__input'
            classNameWrapper='SearchBar__search__input__wrapper'
            placeholder='Type search query..'
            value={this.context.searchInput.value}
            onChange={(evt) => this.context.setSearchInputValue(evt.target.value)}
            onKeyPress={(evt) => this.handleKeyPress(evt)}
          />
          {!!this.context.searchInput.value &&
            <div
              className='SearchBar__search__icon clear clickable'
              onClick={() => this.handleClearButtonClick()}
            />
          }
        </div>
      </div>
    );
  }
}

SearchBar.propTypes = {};

SearchBar.contextType = HubMainScreenContext;

export default storeUtils.getWithState(
  classes.SEARCH_BAR,
  SearchBar
);