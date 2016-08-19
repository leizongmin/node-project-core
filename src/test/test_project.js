/**
 * project-core tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import assert from 'assert';
import utils from 'lei-utils';
import ProjectCore from '../lib/index';


describe('ProjectCore', function () {

  it('project.data', function (done) {

    const project = new ProjectCore();

    project.data.set('a.a', 123);
    project.data.set('a.b', 456);
    project.data.set('b', 'abc');
    assert.equal(project.data.has('a'), true);
    assert.equal(project.data.has('b'), true);
    assert.equal(project.data.has('a.a'), true);
    assert.deepEqual(project.data.get('a'), { a: 123, b: 456 });
    assert.deepEqual(project.data.get('b'), 'abc');
    assert.deepEqual(project.data.all(), { a: { a: 123, b: 456 }, b: 'abc' });

    done();

  });

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

  it('project.extends & project.init', function (done) {

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

  it('project.init #async function', function (done) {

    const project = new ProjectCore();

    const status = {};

    project.init.add(async function () {
      status.a = true;
    });

    project.init.add(async function () {
      status.b = true;
    });

    project.init.add(async function () {
      status.c = true;
    });

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

  it('project.init #sync function', function (done) {

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

  it('project.init #async function - do not use callback', function (done) {

    const project = new ProjectCore();

    const status = {};

    async function sleep(ms) {
      return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
      });
    }

    project.init.add(async function () {
      await sleep(10);
      status.a = true;
    });

    project.init.add(async function () {
      await sleep(10);
      status.b = true;
    });

    project.init.add(async function (next) {
      await sleep(10);
      status.c = true;
      next();
    });

    project.init.add(async function () {
      await sleep(10);
      status.d = true;
    });

    project.init(function (err) {
      assert.notEqual(err, null);
      assert.equal(err.message, `please don\'t use callback in an async function`);
      assert.equal(status.a, true);
      assert.equal(status.b, true);
      assert.equal(status.c, true);
      assert.equal(status.d, undefined);
      done();
    });

  });

  it('project.extends & project.init #error', function (done) {

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

  it('project.ready', function (done) {

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
