/**
 * project-core tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import assert from 'assert';
import mocha from 'mocha';
import {Method, MethodManager} from '../lib/method';


describe('Method', function () {

  it('call #register', function (done) {

    const method = new Method();
    const status = {};

    method.register(function (params, callback) {
      status.register = true;
      assert.deepEqual(params, {a: 123, b: 456});
      callback(null, {a: 456, b: 123});
    });

    method.call({a: 123, b: 456}, (err, ret) => {
      assert.equal(err, null);
      assert.deepEqual(ret, {a: 456, b: 123});

      assert.equal(status.register, true);
      done();
    });

  });

  it('call #none', function (done) {

    const method = new Method();
    const status = {};

    method.call({a: 123, b: 456}, (err, ret) => {
      assert.equal(err, null);
      assert.deepEqual(ret, {a: 123, b: 456});
      done();
    });

  });

  it('call #before', function (done) {

    const method = new Method();
    const status = {};

    method.register(function (params, callback) {
      status.register = true;
      callback(null, params.a + params.b);
    });

    method.before(function (params, callback) {
      status.before = true;
      params.a = Number(params.a);
      params.b = Number(params.b);
      callback(null, params);
    });

    method.call({a: '123', b: '456'}, (err, ret) => {
      assert.equal(err, null);
      assert.deepEqual(ret, 123 + 456);

      assert.equal(status.register, true);
      assert.equal(status.before, true);
      done();
    });

  });

  it('call #after', function (done) {

    const method = new Method();
    const status = {};

    method.register(function (params, callback) {
      status.register = true;
      callback(null, params.a + params.b);
    });

    method.after(function (result, callback) {
      status.after = true;
      callback(null, result + 1000);
    });

    method.call({a: 123, b: 456}, (err, ret) => {
      assert.equal(err, null);
      assert.deepEqual(ret, 123 + 456 + 1000);

      assert.equal(status.register, true);
      assert.equal(status.after, true);
      done();
    });

  });

  it('call #before & after', function (done) {

    const method = new Method();
    const status = {};

    method.register(function (params, callback) {
      status.register = true;
      callback(null, params.a + params.b);
    });

    method.before(function (params, callback) {
      status.before1 = true;
      params.a = Number(params.a);
      params.b = Number(params.b);
      callback(null, params);
    });

    method.before(function (params, callback) {
      status.before2 = true;
      params.a = params.a + 1000;
      params.b = params.b + 1000;
      callback(null, params);
    });

    method.after(function (result, callback) {
      status.after1 = true;
      callback(null, result + 1000);
    });

    method.after(function (result, callback) {
      status.after2 = true;
      callback(null, result + 10000);
    });

    method.call({a: '123', b: '456'}, (err, ret) => {
      assert.equal(err, null);
      assert.deepEqual(ret, 1123 + 1456 + 1000 + 10000);

      assert.equal(status.register, true);
      assert.equal(status.before1, true);
      assert.equal(status.before2, true);
      assert.equal(status.after1, true);
      assert.equal(status.after2, true);
      done();
    });

  });

  it('call #error', function (done) {

    const method = new Method();
    const status = {};

    method.register(function (params, callback) {
      status.register = true;
      assert.deepEqual(params, {a: 123, b: 456});
      callback(new Error('just for test'));
    });

    method.call({a: 123, b: 456}, (err, ret) => {
      assert.equal(err.message, 'just for test');
      assert.equal(status.register, true);

      done();
    });

  });

  it('promise', async function (done) {

    const method = new Method();
    const status = {};

    method.register(function (params, callback) {
      status.register = true;
      assert.deepEqual(params, {a: 123, b: 456});
      callback(null, {a: 456, b: 123});
    });

    try {

      const ret = await method.call({a: 123, b: 456});
      assert.deepEqual(ret, {a: 456, b: 123});

    } catch (err) {
      throw err;
    }

    assert.equal(status.register, true);
    done();

  });

  it('promise #error', async function (done) {

    const method = new Method();
    const status = {};

    method.register(function (params, callback) {
      status.register = true;
      assert.deepEqual(params, {a: 123, b: 456});
      callback(new Error('just for test'));
    });

    try {

      const ret = await method.call({a: 123, b: 456});
      throw new Error('should throw error');

    } catch (err) {

      assert.equal(err.message, 'just for test');
      assert.equal(status.register, true);

    }

    assert.equal(status.register, true);
    done();

  });

});


describe('MethodManager', function () {

  it('normal', async function (done) {

    const manager = new MethodManager();
    try {

      manager.method('math.add').register(function (params, callback) {
        callback(null, params.reduce((a, b) => a + b));
      });

      manager.method('math.times').register(function (params, callback) {
        callback(null, params.reduce((a, b) => a * b));
      });

      manager.method('add').register(function (params, callback) {
        callback(null, params.reduce((a, b) => a + b));
      });

      manager.method('math.*').before(function (params, callback) {
        callback(null, params.map(v => Number(v)));
      });

    } catch (err) {
      console.log(err);
      done(err);
    }
    try {

      const ret1 = await manager.method('math.add').call([123, 456, 789]);
      assert.equal(ret1, 123 + 456 + 789);

      const ret2 = await manager.method('math.times').call([123, 456, 789]);
      assert.equal(ret2, 123 * 456 * 789);

      const ret3 = await manager.method('add').call([123, 456, 789]);
      assert.equal(ret3, 123 + 456 + 789);

      const ret4 = await manager.method('math.add').call(['123', '456', '789']);
      assert.equal(ret4, 123 + 456 + 789);

      const ret5 = await manager.method('math.times').call(['123', '456', '789']);
      assert.equal(ret5, 123 * 456 * 789);

      const ret6 = await manager.method('add').call(['123', '456', '789']);
      assert.equal(ret6, '123456789');

    } catch (err) {
      console.log(err);
      console.log(err.stack);
      throw err;
    }

    done();

  });

});