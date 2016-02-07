/**
 * project-core
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import _utils from 'lei-utils';

const utils = _utils.extend({});

delete utils.extend;

utils.extends = function () {
  const ret = {};
  for (const i in utils) {
    ret[i] = utils[i];
  }
  return ret;
};

utils.runSeries = function (list, thisArg, callback) {
  const next = err => {
    if (err) return callback(err);
    let fn = list.shift();
    if (!fn) return callback(null);
    try {
      const r = fn.call(thisArg, next);
      if (r instanceof Promise) {
        r.catch(callback);
      }
    } catch (err) {
      return callback(err);
    }
  };
  next(null);
};

utils.wrapFn = function (fn, self = null) {
  return function (done) {
    const args = arguments;
    const callback = args[args.length - 1];
    try {
      const ret = fn.apply(self, args);
      if (ret instanceof Promise) {
        ret.catch(callback);
      }
    } catch (err) {
      return callback(err);
    }
  }
};

export default utils;
