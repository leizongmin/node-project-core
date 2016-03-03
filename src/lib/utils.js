/**
 * project-core
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import _utils from 'lei-utils';
import createDebug from 'debug';

const utils = _utils.extend({});

delete utils.extend;

utils.debug = function (name) {
  return createDebug('project-core:' + name);
};
const debug = utils.debug('utils');

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
      if (fn.__sourceLine) debug('runSeries: at %s', fn.__sourceLine);
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

utils.getCallerSourceLine = function () {
  const dir = __dirname + '/';
  const stack = (new Error()).stack.split('\n').slice(1);
  for (let line of stack) {
    line = line.trim();
    if (line.replace(/\\/g, '/').indexOf(dir) === -1) {
      const s = line.match(/\((.*)\)\s*$/);
      if (s) return s[1];
    }
  }
};

utils.deref = function (v) {
  if (Array.isArray(v)) return v.slice();
  if (v && typeof v === 'object') {
    const obj = {};
    for (const i in v) {
      obj[i] = v[i];
    }
    return obj;
  }
  return v;
};

utils.MissingParameterError = utils.customError('missingParameterError', {code: 'missing_parameter', from: 'ProjectCore.method'});
utils.missingParameterError = function (name) {
  return new utils.MissingParameterError(`missing parameter "${name}"`, {name: name});
};

utils.InvalidParameterError = utils.customError('invalidParameterError', {code: 'invalid_parameter', from: 'ProjectCore.method'});
utils.invalidParameterError = function (name) {
  return new utils.InvalidParameterError(`invalid parameter "${name}"`, {name: name});
};

export default utils;
