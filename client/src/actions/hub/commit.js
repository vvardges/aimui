import * as actionTypes from '../actionTypes';
import callApi from '../../services/api';
import { SERVER_API_HOST } from '../../config';

export function getRunsByQuery(query) {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      callApi('Commit.getRunsByQuery', { query })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
}

export function getCommitsMetricsByQuery(query, numPoints) {
  return (dispatch) => {
    // return new Promise((resolve, reject) => {
    //   callApi('Commit.getCommitsMetricsByQuery', {
    //     query,
    //     num_points: numPoints,
    //   })
    //     .then((data) => {
    //       resolve(data);
    //     })
    //     .catch((err) => {
    //       reject(err);
    //     });
    // });
    return new Promise((resolve, reject) => {
      let runsResult = {};
      fetch(`${SERVER_API_HOST}/commits/search/metric?p=${numPoints}&q=${encodeURI(query)}`)
        .then(response => response.body)
        .then(rb => {
          const reader = rb.getReader();

          return new ReadableStream({
            start(controller) {
              function push() {
                reader.read().then(({done, value}) => {
                  if (done) {
                    controller.close();
                    resolve(runsResult);
                    return;
                  }

                  controller.enqueue(value);
                  let i = 0;
                  let cursor = 0;

                  while (true) {
                    if (i === value.length) {
                      break;
                    }

                    if (value[i] === 10) {
                      try {
                        const decodedValue = JSON.parse(new TextDecoder().decode(value.slice(cursor, i)));
                        if (decodedValue.hasOwnProperty('header')) {
                          runsResult = decodedValue['header'];
                        } else if (decodedValue.hasOwnProperty('run')) {
                          runsResult?.['runs']?.push(decodedValue['run'])
                        }
                      } catch (e) {}
                      cursor = i;
                    }

                    i += 1;
                  }

                  push();
                })
              }

              push();
            }
          });
        })
        .then(stream => {
          // Respond with our stream
          // return new Response(stream, { headers: { 'Content-Type': 'text/html' } }).text();
        })
        .then(result => {

        });
    });
  }
}

export function getCommitsDictionariesByQuery(query) {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      callApi('Commit.getCommitsDictionariesByQuery', { query })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
}

export function getCommitTags(commit_id) {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      callApi('Commit.getCommitTags', { commit_id })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
}

export function updateCommitTag(params) {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      callApi('Commit.updateCommitTag', params)
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
}

export function getCommitInfo(experiment, commit_id) {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      callApi('Commit.getCommitInfo', { experiment, commit_id })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
}

export function getTFSummaryList() {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      callApi('Commit.getTFSummaryList')
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
}

export function getTFLogParams(path) {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      callApi('Commit.getTFLogParams', { path })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
}

export function postTFLogParams(path, params, parsed_params) {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      callApi('Commit.postTFLogParams', { path, params, parsed_params })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
}

export function updateCommitArchivationFlag(experiment, commit_id) {
  return (dispatch) => {
    return new Promise((resolve, reject) => {
      callApi('Commit.updateCommitArchivationFlag', { experiment, commit_id })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
}
