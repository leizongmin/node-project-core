[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Gittip][gittip-image]][gittip-url]
[![David deps][david-image]][david-url]
[![node version][node-image]][node-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/project-core.svg?style=flat-square
[npm-url]: https://npmjs.org/package/project-core
[travis-image]: https://img.shields.io/travis/leizongmin/node-project-core.svg?style=flat-square
[travis-url]: https://travis-ci.org/leizongmin/node-project-core
[coveralls-image]: https://img.shields.io/coveralls/leizongmin/node-project-core.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/leizongmin/node-project-core?branch=master
[gittip-image]: https://img.shields.io/gittip/leizongmin.svg?style=flat-square
[gittip-url]: https://www.gittip.com/leizongmin/
[david-image]: https://img.shields.io/david/leizongmin/node-project-core.svg?style=flat-square
[david-url]: https://david-dm.org/leizongmin/node-project-core
[node-image]: https://img.shields.io/badge/node.js-%3E=_4.0-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/
[download-image]: https://img.shields.io/npm/dm/project-core.svg?style=flat-square
[download-url]: https://npmjs.org/package/project-core

# project-core

## Installation

```bash
$ npm install project-core --save
```


## Usage

```javascript
'use strict';

const ProjectCore = require('project-core');

// create new instance
const $ = global.$ = new ProjectCore();

// namespace, you can store data in memory
$.data.set('abc.e.f', 123);
console.log($.data.get('abc'));
// => {e: {f: 123}}

// util functions, extends from lei-utils
console.log($.utils.md5('haha'));
// add your own function
$.utils.say = function () {};

// methods
// register, must be async function
// the first argument is an params object
// the last argument is callback function
$.method('my.hello').register(function (params, callback) {
  callback(null, params.a + params.b);
});
// also support async function
$.method('my.hello').register(async function (params) {
  return params.a + params.b;
});
// register hook: before
$.method('my.hello').before(async function (params) {
  params.a = Number(params.a);
  params.b = Number(params.b);
  return params;
});
// register hook: after
$.method('my.hello').after(function (params, callback) {
  if (isNaN(params)) {
    callback(new TypeError('result is not a number'));
  } else {
    callback(null, params);
  }
});
// register checker
// if missing required parameter, throws an $.utils.MissingParameterError
// if validating parameter failed, throws an $.utils.InvalidParameterError
$.method('my.hello').check({
  a: {                            // parameter name
    required: true,               // set to true if it is required
    validate: (v) => !isNaN(v),   // set validator
  },
});
// notes: when register hook, you can use wildcard in the method name
// for example, "my.*"
// call function
$.method('my.hello').call({a: 123, b: 456}, function (err, ret) {
  console.log(err, ret); // => null, 6
  // if passed {c: 123, d: 456} the result would be => TypeError: result is not a number
});

// extends
$.extends({
  // before: optional, will be called before initializing plugins
  before: function (next) {},
  // init: initialize plugin
  init: function (next) {},
  // after: optional, will be called after plugins initialized
  after: function (next) {},
});

// init queue
// all the functions that added to init queue will be called sequentially
$.init.add(function (next) {});
$.init.add(function (next) {});
// support async function (don't need to use callback)
$.init.add(async function () {});

// add file or dir to init queue
$.init.load('./inits');

// events
// ready: will be emitted when project inited
$.event.once('ready', function () {});
// you can emit a custom event
$.event.emit('haha', Math.random());

// add ready event listener
// if project was inited, callback immediately
$.ready(function () {});

// config
$.config.load('./config');
console.log($.config.get('web.port'));
console.log($.config.has('web.port'));

// init
$.init();
```

### Example config file

```javascript
module.exports = function (set, get, has) {

  set('web.session.secret', '11111111');
  // you can use the get(name) and has(name) to get specific config value

};
```

### Extends and republish your own `project-core`

```javascript
'use strict';

const ProjectCore = require('project-core');

const $ = new ProjectCore();

// extends example
$.extends(require('./extends_config'));
$.extends(require('./extends_orm'));
$.extends(require('./extends_cache'));
$.extends(require('./extends_module'));
$.extends(require('./extends_status'));

// do something when ready
$.event.once('ready', function () {
  // after ready event has been emitted, you can not change anything on project-core instance any more
});

// exports
module.exports = $;
```


## License

```
The MIT License (MIT)

Copyright (c) 2016 Zongmin Lei <leizongmin@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
