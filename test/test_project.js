/**
 * project-core tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const path = require('path');
const assert = require('assert');
const utils = require('lei-utils');
const coroutine = require('lei-coroutine');
const ProjectCore = require('../lib/index');


describe('ProjectCore', function () {

  it('project.utils', function (done) {

    const project = new ProjectCore();

    assert.equal(project.utils.md5('abc'), utils.md5('abc'));

    done();

  });

  it('project.event', function (done) {

    const project = new ProjectCore();

    const status = {};
    project.event.on('a', function (v) {
      status.a = v;
    });
    project.event.on('b', function (v) {
      status.b = v;
    });

    project.event.on('done', function () {
      assert.equal(status.a, 123);
      assert.equal(status.b, 456);
      done();
    });

    project.event.emit('a', 123);
    project.event.emit('b', 456);
    project.event.emit('done');

  });

  it('project.extends() & project.init()', function (done) {

    const project = new ProjectCore();

    const status = {};
    project.extends({
      before(next) {
        assert.equal(project, this);
        status.a = true;
        next();
      },
      init(next) {
        assert.equal(project, this);
        status.b = true;
        next();
      },
      after(next) {
        assert.equal(project, this);
        status.c = true;
        next();
      },
    });

    project.init.add(function (next) {
      assert.equal(project, this);
      status.d = true;
      next();
    });

    project.init.add(function (next) {
      assert.equal(project, this);
      status.e = true;
      next();
    });

    project.init(err => {
      assert.equal(err, null);

      assert.equal(status.a, true);
      assert.equal(status.b, true);
      assert.equal(status.c, true);
      assert.equal(status.d, true);
      assert.equal(status.e, true);

      assert.throws(function () {
        project.init.add(function (next) { next(); });
      }, /inited/);

      assert.throws(function () {
        project.init(function (err) { if (err) throw err; });
      }, /inited/);

      assert.throws(function () {
        project.extends({ init(next) { next(); } });
      }, /inited/);

      done();
    });

  });

  it('project.init() #async function', function (done) {

    const project = new ProjectCore();

    const status = {};

    project.init.add(coroutine.wrap(function* () {
      yield coroutine.delay(10);
      status.a = true;
    }));

    project.init.add(coroutine.wrap(function* () {
      yield coroutine.delay(10);
      status.b = true;
    }));

    project.init.add(coroutine.wrap(function* () {
      yield coroutine.delay(10);
      status.c = true;
    }));

    project.init.add(function (next) {
      status.d = true;
      next();
    });

    project.init(function (err) {
      assert.equal(err, null);
      assert.equal(status.a, true);
      assert.equal(status.b, true);
      assert.equal(status.c, true);
      assert.equal(status.d, true);
      done();
    });

  });

  it('project.init() #sync function', function (done) {

    const project = new ProjectCore();

    const status = {};

    project.init.add(function () {
      status.a = true;
    });

    project.init.add(function (next) {
      setTimeout(function () {
        status.b = true;
        next();
      }, 100);
    });

    project.init.add(function () {
      status.c = true;
    });

    project.init.add(function () {
      status.d = true;
    });

    project.init(function (err) {
      assert.equal(err, null);
      assert.equal(status.a, true);
      assert.equal(status.b, true);
      assert.equal(status.c, true);
      assert.equal(status.d, true);
      done();
    });

  });

  it('project.init() #async function - do not use callback', function (done) {

    const project = new ProjectCore();

    const status = {};

    project.init.add(coroutine.wrap(function* () {
      yield coroutine.delay(10);
      status.a = true;
    }));

    project.init.add(coroutine.wrap(function* () {
      yield coroutine.delay(10);
      status.b = true;
    }));

    project.init.add(coroutine.wrap(function* (next) {
      yield coroutine.delay(10);
      status.c = true;
      next();
    }));

    project.init.add(coroutine.wrap(function* () {
      yield coroutine.delay(10);
      status.d = true;
    }));

    project.init(function (err) {
      assert.notEqual(err, null);
      assert.equal(err.message, `please don't use callback in an async function`);
      assert.equal(status.a, true);
      assert.equal(status.b, true);
      assert.equal(status.c, true);
      assert.equal(status.d, undefined);
      done();
    });

  });

  it('project.extends() & project.init() #error', function (done) {

    const project = new ProjectCore();

    const status = {};
    project.extends({
      before(next) {
        assert.equal(project, this);
        status.a = true;
        next();
      },
      init(next) {
        assert.equal(project, this);
        status.b = true;
        next(new Error('just for test'));
      },
      after(next) {
        assert.equal(project, this);
        status.c = true;
        next();
      },
    });

    project.init.add(function (next) {
      assert.equal(project, this);
      status.d = true;
      next();
    });

    project.init.add(function (next) {
      assert.equal(project, this);
      status.e = true;
      next();
    });

    project.init(err => {
      assert.equal(err.message, 'just for test');

      assert.equal(status.a, true);
      assert.equal(status.b, true);
      assert.notEqual(status.c, true);
      assert.notEqual(status.d, true);
      assert.notEqual(status.e, true);

      done();
    });

  });

  it('project.ready()', function (done) {

    const project = new ProjectCore();

    const status = {};

    project.ready(() => {
      status.ready = true;
    });

    project.init(err => {
      assert.equal(err, null);

      process.nextTick(() => {
        assert.equal(status.ready, true);

        project.ready(() => {
          project.ready(() => done());
        });
      });

    });

  });

  it('project.init(...params, callback)', function (done) {

    const project = new ProjectCore();

    const status = { count: 0 };

    project.init.add(coroutine.wrap(function* (status) {
      yield coroutine.delay(10);
      status.a = true;
    }));

    project.init.add(coroutine.wrap(function* (status) {
      yield coroutine.delay(10);
      status.b = true;
    }));

    project.init.add(coroutine.wrap(function* (status) {
      yield coroutine.delay(10);
      status.c = true;
    }));

    project.init.load(path.resolve(__dirname, './tasks2/a.js'));

    project.init.load(path.resolve(__dirname, './tasks2'));

    project.init(status, function (err) {
      assert.equal(err, null);
      assert.equal(status.a, true);
      assert.equal(status.b, true);
      assert.equal(status.c, true);
      assert.equal(this.$$a, true);
      assert.equal(this.$$b, true);
      assert.equal(this.$$c, true);
      done();
    });

  });

  it('project.run(tasks, callback)', function (done) {

    const project = new ProjectCore();

    const status = { count: 0 };

    project.run(coroutine.wrap(function* () {
      yield coroutine.delay(10);
      status.a = true;
    }), err => {
      assert.equal(err, null);
      assert.equal(status.a, true);
      checkDone();
    });

    project.run(coroutine.wrap(function* () {
      yield coroutine.delay(10);
      status.b = true;
    }), err => {
      assert.equal(err, null);
      assert.equal(status.b, true);
      checkDone();
    });

    project.run(coroutine.wrap(function* () {
      yield coroutine.delay(10);
      status.c = true;
    }), err => {
      assert.equal(err, null);
      assert.equal(status.c, true);
      checkDone();
    });

    project.run(path.resolve(__dirname, './tasks/a.js'), err => {
      assert.equal(err, null);
      assert.equal(project.$$a, true);
      checkDone();
    });

    project.run(path.resolve(__dirname, './tasks'), err => {
      assert.equal(err, null);
      assert.equal(project.$$a, true);
      assert.equal(project.$$b, true);
      assert.equal(project.$$c, true);
      checkDone();
    });

    function checkDone() {
      status.count += 1;
      if (status.count >= 5) {
        done();
      }
    }

  });

  it('project.run(tasks, ...params, callback)', function (done) {

    const project = new ProjectCore();

    const status = { count: 0 };

    project.run(coroutine.wrap(function* (status) {
      yield coroutine.delay(10);
      status.a = true;
    }), status, err => {
      assert.equal(err, null);
      assert.equal(status.a, true);
      checkDone();
    });

    project.run(coroutine.wrap(function* (status) {
      yield coroutine.delay(10);
      status.b = true;
    }), status, err => {
      assert.equal(err, null);
      assert.equal(status.b, true);
      checkDone();
    });

    project.run(coroutine.wrap(function* (status) {
      yield coroutine.delay(10);
      status.c = true;
    }), status, err => {
      assert.equal(err, null);
      assert.equal(status.c, true);
      checkDone();
    });

    project.run(path.resolve(__dirname, './tasks2/a.js'), status, err => {
      assert.equal(err, null);
      assert.equal(project.$$a, true);
      checkDone();
    });

    project.run(path.resolve(__dirname, './tasks2'), status, err => {
      assert.equal(err, null);
      assert.equal(project.$$a, true);
      assert.equal(project.$$b, true);
      assert.equal(project.$$c, true);
      checkDone();
    });

    function checkDone() {
      status.count += 1;
      if (status.count >= 5) {
        done();
      }
    }

  });

});


describe('config', function () {

  it('load *.js', function (done) {

    const project = new ProjectCore();
    project.config.load(path.resolve(__dirname, './config/test1.js'));
    assert.deepEqual(project.config.get('a'), { a: 123, b: 456 });
    done();

  });

  it('load (no extname)', function (done) {

    const project = new ProjectCore();
    project.config.load(path.resolve(__dirname, './config/test1'));
    assert.deepEqual(project.config.all(), { a: { a: 123, b: 456 }});
    done();

  });

  it('load *.json', function (done) {

    const project = new ProjectCore();
    project.config.load(path.resolve(__dirname, './config/test2.json'));
    assert.deepEqual(project.config.all(), { abc: 12345, efg: [ '1', '2', '3' ]});
    done();

  });

  it('load *.yaml', function (done) {

    const project = new ProjectCore();
    project.config.load(path.resolve(__dirname, './config/test3.yaml'));
    assert.deepEqual(project.config.all(), { hello: [ 'world', 'lei' ], true: true, 123: 123 });
    done();

  });

  it('load *.yml', function (done) {

    const project = new ProjectCore();
    project.config.load(path.resolve(__dirname, './config/test3.yml'));
    assert.deepEqual(project.config.all(), { hello: [ 'world', 'lei' ], true: true, 123: 123 });
    done();

  });

});

describe('extends ProjectCore', function () {

  it('extends', function (done) {

    const project = new ProjectCore();

    project.extends({
      init(next) {
        this.hello = msg => `hello, ${ msg }`;
        next();
      },
    });

    project.init(err => {
      assert.equal(err, null);
      assert.equal(project.hello('core'), 'hello, core');
      done();
    });

  });

});
