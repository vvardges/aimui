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
