/**
 * project-core
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import path from 'path';
import {EventEmitter} from 'events';
import {MethodManager} from './method';
import {Namespace} from 'lei-ns';
import utils from './utils';


export default class ProjectCore {

  constructor() {

    this._methodManager = new MethodManager();
    this.data = new Namespace();
    this.utils = utils.extends();

    this._event = new EventEmitter();
    this._event.setMaxListeners(0);
    this.event = {};
    this.event.on = (e, fn) => this._event.on(e, utils.wrapFn(fn, this));
    this.event.once = (e, fn) => this._event.once(e, utils.wrapFn(fn, this));
    this.event.emit = (e, ...args) => {
      args.push(err => this.emit('error', err));
      this._event.emit(e, ...args);
    };
    this._event.on('error', err => {
      if (this._event._events.error.length < 2) {
        console.error(err.stack || err);
      }
    });

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
    utils.runSeries(this._extends, this, err => {
      if (err) {
        this.event.emit('error', err);
        return callback && callback(err);
      }

      utils.runSeries(this.init._queue, this, err => {
        if (err) {
          this.event.emit('error', err);
          return callback && callback(err);
        }

        this.event.emit('ready');
        callback && callback(null);
      });
    });

  }

  ready(callback) {
    if (this.inited) {
      process.nextTick(() => {
        callback = utils.wrapFn(callback);
        callback(null, err => {
          this.event.emit('error', err);
        });
      });
    } else {
      this.event.once('ready', callback);
    }
  }

}