export let SERVER_HOST, SERVER_API_HOST, WS_HOST;

if (window.location.hostname === 'aim-dev.loc') {
  SERVER_HOST = 'http://aim-dev.loc:43801';
  SERVER_API_HOST = `${SERVER_HOST}/api/v1`;
  WS_HOST = 'ws://aim-dev.loc:43802/live';
} else {
  SERVER_HOST = `http://${window.location.hostname}:${window.location.port}`;
  SERVER_API_HOST = `${SERVER_HOST}/api/v1`;
  WS_HOST = `ws://${window.location.hostname}:${window.location.port}/live`;
}

export const USER_ANALYTICS_COOKIE_NAME =
  '__AIMDE__:USER_ANALYTICS_COOKIE_NAME';
export const USER_LAST_SEARCH_QUERY = '__AIMDE__:USER_LAST_SEARCH_QUERY';
export const USER_LAST_EXPLORE_CONFIG = '__AIMDE__:USER_LAST_EXPLORE_CONFIG';
export const EXPLORE_PANEL_FLEX_STYLE = '__AIMDE__:EXPLORE_PANEL_FLEX_STYLE';
export const EXPLORE_PANEL_VIEW_MODE = '__AIMDE__:EXPLORE_PANEL_VIEW_MODE';
export const EXPLORE_METRIC_HIGHLIGHT_MODE =
  '__AIMDE__:EXPLORE_METRIC_HIGHLIGHT_MODE';
export const TABLE_COLUMNS = '__AIMDE__:TABLE_COLUMNS';
export const CONTEXT_TABLE_CONFIG = '__AIMDE__:CONTEXT_TABLE_CONFIG_{name}';
export const EXPLORE_PANEL_SORT_FIELDS = '__AIMDE__:EXPLORE_PANEL_SORT_FIELDS';

export const SEGMENT_DEMO_WRITE_KEY = 'Rj1I4AisLSvsvAnPW7OqkoYBUTXJRBHK';
export const SEGMENT_WRITE_KEY = 'LBnAonwto541z4Dn4ntGJScCsYNRdIC3';

export const AIM_QL_VERSION = 1;
