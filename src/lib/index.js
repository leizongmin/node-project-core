/**
 * project-core
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import {EventEmitter} from 'events';
import {MethodManager} from './method';
import {Namespace} from 'lei-ns';
import utils from 'lei-utils';


function runSeries(list, thisArg, callback) {
  const next = err => {
    if (err) return callback(err);
    let fn = list.shift();
    if (!fn) return callback(null);
    fn.call(thisArg, next);
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
    }

    this._extends = {
      before: [],
      init: [],
      after: [],
    };

    this.inited = false;
    this.event.once('ready', () => this.inited = true);

  }

  _checkInited() {
    if (this.inited) {
      throw new Error('you cannot change project-core after it has been inited');
    }
  }

  method(name) {
    return this._methodManager.method(name);
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

}