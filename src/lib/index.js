'use strict';

/**
 * project-core
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import { Namespace } from 'lei-ns';
import rd from 'rd';
import utils from './utils';
const debug = utils.debug('core');

export default class ProjectCore {

  constructor() {

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
      fn.__sourceLine = utils.getCallerSourceLine();
      debug('init.add: at %s', fn.__sourceLine);
      this.init._queue.push(fn);
    };
    this.init._loadFile = (f) => {
      const m = require(f);
      let ret;
      if (typeof m === 'function') ret = m;
      else if (typeof m.default === 'function') ret = m.default;
      else throw new Error(`module "${ f }" must export as a function`);
      ret.level = m.level || ret.level || 0;
      return ret;
    };
    this.init.load = (f) => {
      if (this.initing) throw new Error('cannot call init.load() after init()');
      const s = fs.statSync(f);
      if (s.isFile()) {
        debug('init.load: %s', f);
        this.init.add(this.init._loadFile(f));
      } else if (s.isDirectory()) {
        const list = rd.readFileFilterSync(f, /\.js$/)
                       .map(f => {
                         debug('init.load: %s', f);
                         return this.init._loadFile(f);
                       })
                       .sort((a, b) => b.level - a.level);
        for (const fn of list) {
          this.init.add(fn);
        }
      } else {
        throw new Error(`"${ f }" is not a file or directory`);
      }
    };

    this.config = new Namespace();
    this.config.load = file => {
      debug('config.load: %s', file);
      const initConfig = require(path.resolve(file));
      if (typeof initConfig !== 'function') {
        throw new Error(`incorrect config file format in file "${ file }"`);
      }
      const args = [
        (n, v) => this.config.set(n, v),
        (n) => this.config.get(n),
        (n) => this.config.has(n),
        this.config,
      ];
      initConfig.call(this.config, ...args);
    };
    this.config._get = this.config.get;
    this.config.get = (n) => {
      const v = this.config._get(n);
      if (v === undefined) {
        throw new TypeError(`config field "${ n }" is undefined`);
      }
      return v;
    };

    this._extends = {
      before: [],
      init: [],
      after: [],
    };

    this._lazycallMethods = new Map();
    this._methodHooks = [];
    this.event.once('ready', () => this._lazycallMethods.clear());

    this.inited = false;
    this.event.once('ready', () => this.inited = true);

  }

  _checkInited() {
    if (this.inited) {
      throw new Error('you cannot change project-core after it has been inited');
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

    this.initing = true;
    this._checkInited();
    debug('initing');

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

        this.initing = false;
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
