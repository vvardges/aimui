import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';

import defaultReducer from './reducers';
import projectReducer from './reducers/project';
import controlPanelReducer from './reducers/controlPanel';

let store;
export function configureStore() {
  store = createStore(combineReducers({
    default: defaultReducer,
    project: projectReducer,
    controlPanel: controlPanelReducer,
  }), applyMiddleware(thunk));
}
configureStore();

export default store;