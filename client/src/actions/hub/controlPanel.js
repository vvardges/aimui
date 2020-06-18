import * as actionTypes from '../actionTypes';
import callApi from '../../services/api';


export function getProjectInsight(insight_name) {
  return dispatch => {
    return new Promise((resolve, reject) => {
      dispatch({
        type: actionTypes.PANEL_LOADING_STATUS,
      });

      callApi('Project.getProjectInsight', {
        insight_name
      }).then((data) => {
        dispatch({
          type: actionTypes.PANEL_SET_DATA,
          data,
        });
        resolve(data);
      }).catch((err) => {
        dispatch({
          type: actionTypes.PANEL_SET_DATA,
          data: {},
        });
        reject(err);
      });
    });
  }
}