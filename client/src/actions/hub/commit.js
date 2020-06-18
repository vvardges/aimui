import * as actionTypes from '../actionTypes';
import callApi from '../../services/api';


export function getCommitsByQuery(query) {
  return dispatch => {
    return new Promise((resolve, reject) => {
      dispatch({
        type: actionTypes.PANEL_LOADING_STATUS,
      });

      callApi('Commit.getCommitsByQuery', { query }).then((data) => {
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

export function getCommitTags(commit_id) {
  return dispatch => {
    return new Promise((resolve, reject) => {
      callApi('Commit.getCommitTags', { commit_id }).then((data) => {
        resolve(data);
      }).catch((err) => {
        reject(err);
      });
    });
  }
}

export function updateCommitTag(commit_hash, tag_id) {
  return dispatch => {
    return new Promise((resolve, reject) => {
      callApi('Commit.updateCommitTag', { commit_hash, tag_id }).then((data) => {
        resolve(data);
      }).catch((err) => {
        reject(err);
      });
    });
  }
}

export function getCommitInfo(experiment, commit_id) {
  return dispatch => {
    return new Promise((resolve, reject) => {
      callApi('Commit.getCommitInfo', { experiment, commit_id }).then((data) => {
        resolve(data);
      }).catch((err) => {
        reject(err);
      });
    });
  }
}