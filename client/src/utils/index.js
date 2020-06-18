import { useState, useLayoutEffect } from 'react';


export function classNames() {
  let result = [];

  [].concat(Array.prototype.slice.call(arguments)).forEach(function (item) {
    if (!item) {
      return;
    }
    switch (typeof item === 'undefined' ? 'undefined' : typeof item) {
      case 'string':
        result.push(item);
        break;
      case 'object':
        Object.keys(item).forEach(function (key) {
          if (item[key]) {
            result.push(key);
          }
        });
        break;
      default:
        result.push('' + item);
    }
  });

  return result.join(' ');
}

export function useWindowSize() {
  let [size, setSize] = useState([0, 0]);

  useLayoutEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    updateSize();

    window.addEventListener('resize', updateSize);

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
}

export function buildUrl(pattern, { ...params }) {
  let url = pattern;
  for(let param in params) {
    let regex = new RegExp( ':' + param, 'g');
    url = url.replace(regex, params[param]);
  }

  return url;
}

export function formatSize(size) {
  let scaled = 0;
  let metric = '';

  if (size < 1024) {
    scaled = 1;
    metric = 'KB';
  } else if (size < 1024 * 1024) {
    scaled = size / 1024;
    metric = 'KB';
  } else if (size < 1024 * 1024 * 1024) {
    scaled = size / (1024 * 1024);
    metric = 'MB';
  } else if (size < Math.pow(1024, 4)) {
    scaled = size / Math.pow(1024, 3);
    metric = 'GB';
  }

  let ceilSize = Math.ceil(scaled * 100) / 100;
  return [ceilSize, metric];
}

export function userImage(img) {
  return img || require('../asset/user-ill.png');
}