import * as actionTypes from '../actions/actionTypes';

const initialState = {
  project: {},
  isLoading: true,
};

export default function reduce(state = initialState, action = {}) {
  switch (action.type) {
    case actionTypes.HUB_PROJECT:
      return Object.assign({}, state, {
        project: action.data,
        isLoading: false,
      });

    case actionTypes.HUB_PROJECT_NOT_FOUND:
      return Object.assign({}, state, {
        project: {},
        isLoading: false,
      });

    case actionTypes.HUB_PROJECT_STATE_RESET:
      return Object.assign({}, state, {
        project: {},
        isLoading: true,
      });

    default:
      return state;
  }
}