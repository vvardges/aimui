import * as actionTypes from '../actions/actionTypes';

const initialState = {
  data: {},
  isLoading: false,
};

export default function reduce(state = initialState, action = {}) {
  switch (action.type) {
    case actionTypes.PANEL_SET_DATA:
      return Object.assign({}, state, {
        data: action.data,
        isLoading: false,
      });

    case actionTypes.PANEL_LOADING_STATUS:
      return Object.assign({}, state, {
        data: {},
        isLoading: true,
      });

    default:
      return state;
  }
}