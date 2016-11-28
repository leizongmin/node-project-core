'use strict';

/**
 * project-core
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
const { Namespace } = require('lei-ns');
const rd = require('rd');
const yaml = require('js-yaml');
const utils = require('./utils');
const debug = utils.debug('core');

module.exports = class ProjectCore {

  constructor() {
    this.utils = utils.extends();

    this._event = new EventEmitter();
    this._event.setMaxListeners(0);
    this.event = {};
    this.event.on = (e, fn) => this._event.on(e, utils.wrapFn(fn, this));
    this.event.once = (e, fn) => this._event.once(e, utils.wrapFn(fn, this));
    this.event.emit = (e, ...args) => {
      this._event.emit(e, ...args);
    };
    this._event.on('error', err => {
      if (this._event._events.error.length < 2) {
        console.error(err.stack || err);
      }
    });

    this.init._queue = [];
    this.init.add = (fn) => {
      this._checkIniting();
      this._checkInited();
      this.init._queue.push(this._wrapTask(fn));
    };
    this.init.load = (f) => {
      this._checkIniting();
      this._checkInited();
      const list = this._loadFileOrDirectory(f);
      for (const fn of list) {
        this.init.add(fn);
      }
    };

    this.config = new Namespace();
    this.config.load = file => {
      debug('config.load: %s', file);
      try {
        const fullPath = path.resolve(file);
        const ext = path.extname(fullPath).toLowerCase();
        if (ext === '.yaml' || ext === '.yml') {
          this.config.merge(yaml.safeLoad(fs.readFileSync(fullPath).toString()));
        } else if (ext === '.json') {
          this.config.merge(require(fullPath));
        } else if (ext === '.js' || ext === '') {
          const initConfig = require(fullPath);
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
        }
      } catch (err) {
        throw new Error(`failed to load config file "${ file }": ${ err.message }`);
      }
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

    this.inited = false;
    this.event.once('ready', () => {
      this.inited = true;
    });
  }

  _wrapTask(fn) {
    fn.__sourceLine = utils.getCallerSourceLine();
    debug('wrap: at %s', fn.__sourceLine);
    return fn;
  }

  _loadFile(f) {
    const m = require(f);
    let ret;
    if (typeof m === 'function') ret = m;
    else if (typeof m.default === 'function') ret = m.default;
    else throw new Error(`module "${ f }" must export as a function`);
    ret.level = m.level || ret.level || 0;
    return this._wrapTask(ret);
  }

  _loadFileOrDirectory(f) {
    const s = fs.statSync(f);
    if (s.isFile()) {
      debug('load: %s', f);
      return [ this._loadFile(f) ];
    } else if (s.isDirectory()) {
      return rd
              .readFileFilterSync(f, /\.js$/)
              .map(f => {
                debug('load: %s', f);
                return this._loadFile(f);
              })
              .sort((a, b) => b.level - a.level);
    }
    throw new Error(`"${ f }" is not a file or directory`);
  }

  _checkInited() {
    if (this.inited) {
      throw new Error('you cannot change project-core after it has been inited');
    }
  }

  _checkIniting() {
    if (this.initing) {
      throw new Error('you cannot change project-core while it is initing');
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

  init(...params) {
    this.initing = true;
    this._checkInited();
    debug('initing');

    const callback = params.pop();
    const cb = err => {
      if (callback) {
        callback.call(this, err);
      }
    };

    this._extends = this._extends.before.concat(this._extends.init, this._extends.after);
    utils.runSeries(this._extends, this, params, err => {
      if (err) {
        this.event.emit('error', err);
        return cb(err);
      }

      utils.runSeries(this.init._queue, this, params, err => {
        if (err) {
          this.event.emit('error', err);
          return cb(err);
        }

        this.initing = false;
        this.event.emit('ready');
        cb(null);
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

  run(tasks, ...params) {
    const callback = params.pop();
    const cb = err => {
      if (typeof callback === 'function') {
        callback(err);
      } else if (err) {
        this.emit('error', err);
      }
    };
    const runTasks = list => {
      utils.runSeries(list, this, params, cb);
    };
    if (typeof tasks === 'function') {
      runTasks([ tasks ]);
    } else {
      runTasks(this._loadFileOrDirectory(tasks));
    }
  }

};
