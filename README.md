[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![David deps][david-image]][david-url]
[![node version][node-image]][node-url]
[![npm download][download-image]][download-url]
[![npm license][license-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/project-core.svg?style=flat-square
[npm-url]: https://npmjs.org/package/project-core
[travis-image]: https://img.shields.io/travis/leizongmin/node-project-core.svg?style=flat-square
[travis-url]: https://travis-ci.org/leizongmin/node-project-core
[coveralls-image]: https://img.shields.io/coveralls/leizongmin/node-project-core.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/leizongmin/node-project-core?branch=master
[david-image]: https://img.shields.io/david/leizongmin/node-project-core.svg?style=flat-square
[david-url]: https://david-dm.org/leizongmin/node-project-core
[node-image]: https://img.shields.io/badge/node.js-%3E=_6.0-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/
[download-image]: https://img.shields.io/npm/dm/project-core.svg?style=flat-square
[download-url]: https://npmjs.org/package/project-core
[license-image]: https://img.shields.io/npm/l/project-core.svg

# project-core

## Installation

```bash
$ npm install project-core --save
```

**Notes: only support Node.js v6.0 or above**


## Usage

```javascript
'use strict';

const ProjectCore = require('project-core');

// create new instance
const $ = global.$ = new ProjectCore();

// util functions, extends from lei-utils
console.log($.utils.md5('haha'));
// add your own function
$.utils.say = function () {};

// extends
$.extends({
  // before: optional, will be called before initializing plugins
  before(next) {},
  // init: initialize plugin
  init(next) {},
  // after: optional, will be called after plugins initialized
  after(next) {},
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


### Configuration file

#### JavasSript file

exmaple file `dev.js`:

```javascript
module.exports = function (set, get, has) {

  set('web.session.secret', '11111111');
  // use the get(name) and has(name) to get specific config value
  // you can also use this.set(), this.get() and this.has()
  // for exmaple: this.set('we.session.secret')

};
```

use `$.config.load('/path/to/dev.js')` or `$.config.load('/path/to/dev')` to load this config file.

#### JSON file

example file `dev.json`:

```json
{
  "web": {
    "session": {
      "secret": "11111111"
    }
  }
}
```

use `$.config.load('/path/to/dev.json')` to load this config file.

#### YAML file

example file `dev.yaml` (or `dev.yml`):

```yaml
web:
  session:
    secret: '11111111'
```

use `$.config.load('/path/to/dev.yaml')` to load this config file.


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

or:

```javascript
'use strict';

const ProjectCore = require('project-core');

class MyProject extends ProjectCore {

  constructor() {
    super();
    // do something
  }

  init(callback) {
    // do something before init...
    // and then call super.init()
    super.init(callback);
  }

}
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
