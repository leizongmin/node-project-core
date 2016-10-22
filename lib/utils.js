'use strict';

/**
 * project-core
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const _utils = require('lei-utils');
const createDebug = require('debug');

const utils = module.exports = _utils.extend({});

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

utils.runSeries = function (list, thisArg, cb) {
  let params = [];
  if (arguments.length === 4) {
    // eslint-disable-next-line
    params = arguments[2];
    // eslint-disable-next-line
    cb = arguments[3];
  }

  let isCallback = false;
  const callback = err => {
    if (isCallback) {
      debug('runSeries: multi callback(err=%s)', err);
    } else {
      isCallback = true;
      debug('runSeries: callback, err=%s', err);
      process.nextTick(() => cb.call(thisArg, err, ...params));
    }
  };

  const next = err => {
    if (err) return callback(err);
    if (isCallback) return callback(new Error('has been callback'));

    const fn = list.shift();
    if (!fn) return callback(null);

    const isSync = fn.length <= params.length;
    let isPromise = false;
    let r = null;

    try {

      if (fn.__sourceLine) debug('runSeries: at %s', fn.__sourceLine);
      r = fn.call(thisArg, ...params, (err) => {
        if (isPromise) return callback(new Error(`please don't use callback in an async function`));
        next(err);
      });
      isPromise = utils.isPromise(r);

    } catch (err) {
      return callback(err);
    }

    if (isPromise) {
      r.then(_ => next()).catch(callback);
    } else if (isSync) {
      process.nextTick(next);
    }
  };
  next(null);
};

utils.wrapFn = function (fn, self = null) {
  return function (_) {
    const args = arguments;
    const callback = args[args.length - 1];
    try {
      const ret = fn.apply(self, args);
      if (utils.isPromise(ret)) {
        ret.catch(callback);
      }
    } catch (err) {
      return callback(err);
    }
  };
};

utils.getCallerSourceLine = function () {
  const dir = `${ __dirname }/`;
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

utils.MissingParameterError = utils.customError('missingParameterError', { code: 'missing_parameter', from: 'ProjectCore.method' });
utils.missingParameterError = function (name) {
  return new utils.MissingParameterError(`missing parameter "${ name }"`, { name });
};

utils.InvalidParameterError = utils.customError('invalidParameterError', { code: 'invalid_parameter', from: 'ProjectCore.method' });
utils.invalidParameterError = function (name) {
  return new utils.InvalidParameterError(`invalid parameter "${ name }"`, { name });
};
