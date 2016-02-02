/**
 * project-core method
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import escapeStringRegexp from 'escape-string-regexp';


export class Method {

  constructor(name) {
    this.name = name || null;
    this._fn = null;
    this._before = [];
    this._after = [];
  }

  _wrap(fn) {
    return function (params, callback) {
      const ret = fn(params, callback);
      if (ret instanceof Promise) {
        ret.catch(callback);
      }
    };
  }

  register(fn) {
    this._fn = this._wrap(fn);
    return this;
  }

  before(fn) {
    this._before.push(this._wrap(fn));
    return this;
  }

  after(fn) {
    this._after.push(this._wrap(fn));
    return this;
  }

  call(params, callback) {
    return new Promise((resolve, reject) => {
      const list = [].concat(this._before, this._fn, this._after);
      const next = (err, result) => {
        if (err) return cb(err);
        const fn = list.shift();
        if (!fn) return cb(null, result);
        fn(result, next);
      };
      const cb = (err, result) => {
        if (err) {
          reject(err);
          callback && callback(err);
        } else {
          resolve(result);
          callback && callback(null, result);
        }
      };
      next(null, params);
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
        register(fn) {
          throw new Error('register method does not support wildcards');
        },
      };
    }
    return method;
  }

}
