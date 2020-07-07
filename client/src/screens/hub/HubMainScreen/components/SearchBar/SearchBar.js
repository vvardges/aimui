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
      commitSearchQuery: 'metric:loss',
      prevQuery: '',
    };
  }

  componentDidMount() {
    this.search();
  }

  search = () => {
    const query = this.state.commitSearchQuery.trim();

    if (query === this.state.prevQuery) {
      // return;
    } else {
      this.setState(() => {
        return {
          prevQuery: query,
        };
      });
    }

    if (query) {
      this.context.getDataByQuery(query);
    }
  };

  handleKeyPress = (evt) => {
    if (evt.charCode === 13) {
      this.search();
      return false;
    }
  };

  render() {
    return (
      <div className='SearchBar'>
        <UI.Input
          className='SearchBar__search__input'
          classNameWrapper='SearchBar__search__input__wrapper'
          placeholder='Type search query..'
          value={this.state.commitSearchQuery}
          onChange={(evt) => this.setState({ commitSearchQuery: evt.target.value })}
          onKeyPress={(evt) => this.handleKeyPress(evt)}
        />
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