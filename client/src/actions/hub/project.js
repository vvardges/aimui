import * as actionTypes from '../actionTypes';
import callApi from '../../services/api';


export function getProject() {
  return dispatch => {
    return new Promise((resolve, reject) => {
      callApi('Project.getProject', ).then((data) => {
        dispatch({
          type: actionTypes.HUB_PROJECT,
          data,
        });
        resolve(data);
      }).catch((err) => {
        dispatch({
          type: actionTypes.HUB_PROJECT_NOT_FOUND,
        });
        reject(err);
      });
    });
  }
}

export function resetProjectState() {
  return dispatch => {
    dispatch({
      type: actionTypes.HUB_PROJECT_STATE_RESET,
    });
  }
}

export function getExperiment(experiment_name, commit_id) {
  return dispatch => {
    return new Promise((resolve, reject) => {
      callApi('Project.getExperiment', {
        experiment_name, commit_id
      }).then((data) => {
        resolve(data);
      }).catch((err) => {
        reject(err);
      });
    });
  }
}

export function getExperimentComponent(experiment_name, commit_id, path) {
  return dispatch => {
    return new Promise((resolve, reject) => {
      callApi('Project.getExperimentComponent', {
        experiment_name, commit_id, path
      }).then((data) => {
        resolve(data);
      }).catch((err) => {
        reject(err);
      });
    });
  }
}

export function downloadModel(experiment_name, model_name) {
  return dispatch => {
    return new Promise((resolve, reject) => {
      callApi('Project.downloadModel', {
        experiment_name, model_name
      }).then((data) => {
        resolve(data);
      }).catch((err) => {
        reject(err);
      });
    });
  }
}