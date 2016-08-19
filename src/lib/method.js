'use strict';

/**
 * project-core method
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import escapeStringRegexp from 'escape-string-regexp';
import utils from './utils';
const debug = utils.debug('method');

export class Method {

  /**
   * Method
   *
   * @param {String} name
   * @return {Object}
   */
  constructor(name) {
    this.name = name || null;
    this._fn = null;
    this._before = [];
    this._after = [];
    this._catch = [];
    this._check = null;
  }

  _wrap(fn, baseArgc) {

    if (typeof fn !== 'function') {
      throw new TypeError(`argument must be a function`);
    }

    const wrap = function (params, callback) {
      debug(' - run - %s %s at %s', fn.__type, fn.__name, fn.__sourceLine);
      return fn(params, callback);
    };
    // extra info
    wrap.__sourceLine = fn.__sourceLine;
    wrap.__type = fn.__type;
    wrap.__name = fn.__name = this.name || 'anonymous';
    wrap.__isSync = fn.__isSync = fn.length <= baseArgc;

    return wrap;
  }

  /**
   * check params becore calling method
   *
   * example:
   *
   * ```
   * check({
   *   a: {                            // parameter name
   *     required: true,               // set to true if it is required
   *     validate: (v) => !isNaN(v),   // set validator
   *   },
   * })
   * ```
   *
   * @param {Object} options
   * @return {this}
   */
  check(options = null) {
    debug('method.check: %j at %s', options, utils.getCallerSourceLine());
    this._check = options;
    return this;
  }

  /**
   * register function
   *
   * example:
   *
   * ```
   * register(function (params, callback) {
   *   callback(null, newParams);
   * });
   * // or
   * register(async function (params) {
   *   return newParams;
   * });
   * ```
   *
   * @param {Function} fn
   * @return {this}
   */
  register(fn) {
    fn.__type = 'main';
    fn.__sourceLine = utils.getCallerSourceLine();
    debug('method.register: %s at %s', this.name, fn.__sourceLine);
    this._fn = this._wrap(fn, 1);
    return this;
  }

  /**
   * register before hook
   *
   * @param {Function} fn
   * @return {this}
   */
  before(fn) {
    fn.__type = 'before';
    fn.__sourceLine = utils.getCallerSourceLine();
    debug('method.before: %s at %s', this.name, fn.__sourceLine);
    this._before.push(this._wrap(fn, 1));
    return this;
  }

  /**
   * register after hook
   *
   * @param {Function} fn
   * @return {this}
   */
  after(fn) {
    fn.__type = 'after';
    fn.__sourceLine = utils.getCallerSourceLine();
    debug('method.after: %s at %s', this.name, fn.__sourceLine);
    this._after.push(this._wrap(fn, 1));
    return this;
  }

  /**
   * catch error
   *
   * ```
   * catch(function (err, params, result) {
   *   // do something to record this error
   * });
   * ```
   *
   * @param {Function} fn
   * @return {this}
   */
  catch(fn) {
    fn.__type = 'catch';
    fn.__sourceLine = utils.getCallerSourceLine();
    debug('method.catch: %s at %s', this.name, fn.__sourceLine);
    this._catch.push(fn);
    return this;
  }

  _processCatch(err, params, result) {
    for (const fn of this._catch) {
      try {
        fn(err, params, result);
      } catch (err) {
        console.error('call catch function failed at file %s\n%s', fn.__sourceLine, err.stack || err);
      }
    }
  }

  /**
   * call method
   *
   * @param {Object} params
   * @param {Function} callback
   * @return {Promise}
   */
  call(_params, cb) {
    return new Promise((resolve, reject) => {

      const params = utils.deref(_params);

      // wrap callback
      let isCallback = false;
      const callback = (err, result) => {
        if (isCallback) {
          debug('call: multi callback(err=%s)', err);
        } else {
          isCallback = true;
          process.nextTick(() => {
            if (err) {
              this._processCatch(err, params, result);
              reject(err);
              cb && cb(err);
            } else {
              resolve(result);
              cb && cb(null, result);
            }
          });
        }
      };

      // check params
      try {
        if (this._check) {
          for (const n in this._check) {
            if (this._check[n].required && !(n in params)) {
              return callback(utils.missingParameterError(n));
            }
          }
          for (const n in params) {
            if (this._check[n] && this._check[n].validate && !this._check[n].validate(params[n])) {
              return callback(utils.invalidParameterError(n));
            }
          }
        }
      } catch (err) {
        return callback(err);
      }

      // concat all hooks and call function list
      const list = [].concat(this._before, this._fn, this._after);
      debug('method.call: %s handlers=%s', this.name, list.length);

      const next = (err, result) => {

        if (err) return callback(err, result);
        if (isCallback) return callback(new Error('has been callback'));

        const fn = list.shift();
        if (!fn) return callback(null, result);

        const isSync = fn.__isSync;
        let isPromise = false;
        let r = null;

        try {
          r = fn(result, (err, ret) => {
            if (isPromise) return callback(new Error(`please don't use callback in an async function`));
            next(err, ret);
          });
          isPromise = utils.isPromise(r);
        } catch (err) {
          return callback(err, result);
        }

        if (isPromise) {
          r.then(ret => next(null, ret))
           .catch(err => next(err, result));
        } else if (isSync) {
          next(null, r);
        }
      };

      if (this._fn === null) {
        return callback(new TypeError(`please register a handler for method ${ this.name }`));
      } else {
        return next(null, params);
      }
    });
  }

}

export class MethodManager {

  constructor() {
    this._method = new Map();
  }

  method(name) {
    return this._method.get(name) || this._newMethod(name);
  }

  _newMethod(name) {
    let method;
    if (name.indexOf('*') === -1) {
      method = new Method(name);
      this._method.set(name, method);
    } else {
      const pattern = escapeStringRegexp(name).replace(/\\[*]/g, '(.*?)');
      const re = new RegExp('^' + pattern + '$');
      const filterMethod = () => {
        const list = [];
        for (const k of this._method.keys()) {
          if (re.test(k)) {
            list.push(this._method.get(k));
          }
        }
        return list;
      };
      method = {
        before(fn) {
          filterMethod().forEach(m => m.before(fn));
        },
        after(fn) {
          filterMethod().forEach(m => m.after(fn));
        },
        catch(fn) {
          filterMethod().forEach(m => m.catch(fn));
        },
        register(fn) {
          throw new Error('register method does not support wildcards');
        },
      };
    }
    return method;
  }

}
