/**
 * project-core
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import path from 'path';
import {EventEmitter} from 'events';
import {MethodManager} from './method';
import {Namespace} from 'lei-ns';
import utils from 'lei-utils';


function runSeries(list, thisArg, callback) {
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
}

export default class ProjectCore {

  constructor() {

    this._methodManager = new MethodManager();
    this.data = new Namespace();
    this.event = new EventEmitter();
    this.utils = utils.extend({});

    this.init._queue = [];
    this.init.add = (fn) => {
      this._checkInited();
      this.init._queue.push(fn);
    };

    this.config = new Namespace();
    this.config.load = file => {
      require(path.resolve(file))(
        (n, v) => this.config.set(n, v),
        (n) => this.config.get(n),
        (n) => this.config.has(n),
      );
    };
    this.config._get = this.config.get;
    this.config.get = (n) => {
      const v = this.config._get(n);
      if (v === undefined) {
        throw new TypeError(`config field "${n}" is undefined`);
      }
      return v;
    };

    this._extends = {
      before: [],
      init: [],
      after: [],
    };

    this._lazycallMethods = new Map();
    this.event.once('ready', () => this._lazycallMethods.clear());

    this.inited = false;
    this.event.once('ready', () => this.inited = true);

  }

  _checkInited() {
    if (this.inited) {
      throw new Error('you cannot change project-core after it has been inited');
    }
  }

  _getLazycallMethod(name) {
    if (this._lazycallMethods.has(name)) {
      return this._lazycallMethods.get(name);
    } else {
      const self = this;
      const method = {
        register(fn) {
          return self._methodManager.method(name).register(fn);
        },
        before(fn) {
          return self._methodManager.method(name).before(fn);
        },
        after(fn) {
          return self._methodManager.method(name).after(fn);
        },
        call(params, callback) {
          return new Promise((resolve, reject) => {
            self.ready(() => {
              self._methodManager.method(name).call(params, (err, ret) => {
                if (err) {
                  reject(err);
                  callback && callback(err);
                } else {
                  resolve(ret);
                  callback && callback(null, ret);
                }
              });
            });
          });
        },
      };
      this._lazycallMethods.set(name, method);
      return method;
    }
  }

  method(name) {
    if (this.inited) {
      return this._methodManager.method(name);
    } else {
      return this._getLazycallMethod(name);
    }
  }

  extends(info) {

    this._checkInited();

    if (typeof info.before === 'function') {
      this._extends.before.push(info.before);
    }
    if (typeof info.init === 'function') {
      this._extends.init.push(info.init);
    }
    if (typeof info.after === 'function') {
      this._extends.after.push(info.after);
    }

  }

  init(callback) {

    this._checkInited();

    this._extends = this._extends.before.concat(this._extends.init, this._extends.after);
    runSeries(this._extends, this, err => {
      if (err) {
        this.event.emit('init error', err);
        return callback && callback(err);
      }

      runSeries(this.init._queue, this, err => {
        if (err) {
          this.event.emit('init error', err);
          return callback && callback(err);
        }

        this.event.emit('ready');
        callback && callback(null);
      });
    });

  }

  ready(callback) {
    if (this.inited) {
      process.nextTick(callback);
    } else {
      this.event.once('ready', callback);
    }
  }

}