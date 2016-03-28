/**
 * project-core tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import assert from 'assert';
import mocha from 'mocha';
import async from 'async';
import {Method, MethodManager} from '../lib/method';
import utils from '../lib/utils';


describe('Method', function () {

  it('register none function', function (done) {

    const method = new Method();

    assert.throws(function () {
      method.register(123);
    });

    assert.throws(function () {
      method.before(null);
    });

    assert.throws(function () {
      method.after('ok');
    });

    done();

  });

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
      assert.ok(err instanceof Error);
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

  it('catch normal error', function (done) {

    const method = new Method();
    const status = {before: false, after: false};

    method.register(function (params, callback) {
      throw new Error('just for test');
    });

    method.before(function (params, callback) {
      status.before = true;
      process.nextTick(function () {
        callback(null, params);
      });
    });

    method.after(function (params, callback) {
      status.after = true;
      process.nextTick(function () {
        callback(null, params);
      });
    });

    method.call(123, function (err, result) {
      assert.equal(err.message, 'just for test');

      assert.equal(status.before, true);
      assert.equal(status.after, false);

      done();
    });

  });

  it('catch async function error', function (done) {

    const method = new Method();
    const status = {before: false, after: false};

    method.register(async function (params) {
      throw new Error('just for test');
    });

    method.before(function (params, callback) {
      status.before = true;
      process.nextTick(function () {
        callback(null, params);
      });
    });

    method.after(function (params, callback) {
      status.after = true;
      process.nextTick(function () {
        callback(null, params);
      });
    });

    method.call(123, function (err, result) {
      assert.equal(err.message, 'just for test');

      assert.equal(status.before, true);
      assert.equal(status.after, false);

      done();
    });

  });

  it('check() - #1', function (done) {

    const method = new Method();

    method.register(function (params, callback) {
      callback(null, `${params.a}:${params.b}`);
    });

    method.check({
      a: {required: true, validate: (v) => !isNaN(v)},
      b: {validate: (v) => (typeof v === 'string' && v[0] === '$')},
    });

    async.series([
      function (next) {

        method.call({}, function (err, ret) {
          if (err instanceof utils.MissingParameterError) {
            if (err.name !== 'a') {
              return next(new Error('parameter name must be "a"'));
            }
            return next();
          } else {
            return next(new Error('should throws MissingParameterError'));
          }
        });

      },
      function (next) {

        method.call({a: 'a'}, function (err, ret) {
          if (err instanceof utils.InvalidParameterError) {
            if (err.name !== 'a') {
              return next(new Error('parameter name must be "a"'));
            }
            return next();
          } else {
            return next(new Error('should throws InvalidParameterError'));
          }
        });

      },
      function (next) {

        method.call({a: '123', b: 'bb'}, function (err, ret) {
          if (err instanceof utils.InvalidParameterError) {
            if (err.name !== 'b') {
              return next(new Error('parameter name must be "b"'));
            }
            return next();
          } else {
            return next(new Error('should throws InvalidParameterError'));
          }
        });

      },
      function (next) {

        method.call({a: '123', b: '$b'}, function (err, ret) {
          assert.equal(err, null);
          assert.equal(ret, '123:$b');
          next();
        });

      },
      function (next) {

        method.call({a: '123'}, function (err, ret) {
          assert.equal(err, null);
          assert.equal(ret, '123:undefined');
          next();
        });

      },
    ], done);

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

      manager.method('math.*').after(function (result, callback) {
        callback(isNaN(result) ? new Error('result is not a number') : null, result);
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

    let ret7ok = false;
    try {
      const ret7 = await manager.method('math.add').call([1, NaN]);
      console.log(ret7);
    } catch (err) {
      ret7ok = true;
      console.log(err);
    }
    if (!ret7ok) throw new Error('should throws error `result is not a number`');

    done();

  });

  it('async function - call #before & after', function (done) {

    const method = new Method();
    const status = {};

    function sleep(ms) {
      return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
      });
    }

    method.register(async function (params) {
      sleep(50);
      status.register = true;
      return params.a + params.b;
    });

    method.before(async function (params) {
      status.before1 = true;
      params.a = Number(params.a);
      params.b = Number(params.b);
      return params;
    });

    method.before(async function (params) {
      sleep(50);
      status.before2 = true;
      params.a = params.a + 1000;
      params.b = params.b + 1000;
      return params;
    });

    method.after(async function (result) {
      status.after1 = true;
      return result + 1000;
    });

    method.after(async function (result) {
      sleep(50);
      status.after2 = true;
      return result + 10000;
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

  it('async function - call #error', function (done) {

    const method = new Method();
    const status = {};

    method.register(async function (params) {
      status.register = true;
      assert.deepEqual(params, {a: 123, b: 456});
      throw new Error('just for test');
    });

    method.call({a: 123, b: 456}, (err, ret) => {
      assert.equal(err.message, 'just for test');
      assert.equal(status.register, true);

      done();
    });

  });

  it('async function - call #do not use callback', function (done) {

    const method = new Method();
    const status = {};

    function sleep(ms) {
      return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
      });
    }

    method.register(async function (params, callback) {
      await sleep(50);
      status.register = true;
      assert.deepEqual(params, {a: 123, b: 456});
      callback(new Error('just for test'));
    });

    method.call({a: 123, b: 456}, (err, ret) => {
      assert.equal(err.message, `please don't use callback in an async function`);
      assert.equal(status.register, true);

      done();
    });

  });

  it('sync function - call #before & after', function (done) {

    const method = new Method();
    const status = {};

    function sleep(ms) {
      return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
      });
    }

    method.register(function (params) {
      status.register = true;
      return params.a + params.b;
    });

    method.before(async function (params) {
      status.before1 = true;
      params.a = Number(params.a);
      params.b = Number(params.b);
      return params;
    });

    method.before(function (params) {
      status.before2 = true;
      params.a = params.a + 1000;
      params.b = params.b + 1000;
      return params;
    });

    method.after(function (result) {
      status.after1 = true;
      return result + 1000;
    });

    method.after(async function (result) {
      sleep(50);
      status.after2 = true;
      return result + 10000;
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

  it('sync function - call #error', function (done) {

    const method = new Method();
    const status = {};

    method.register(function (params) {
      status.register = true;
      assert.deepEqual(params, {a: 123, b: 456});
      throw new Error('just for test');
    });

    method.call({a: 123, b: 456}, (err, ret) => {
      assert.equal(err.message, 'just for test');
      assert.equal(status.register, true);

      done();
    });

  });

});
