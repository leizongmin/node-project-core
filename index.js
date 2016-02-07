/**
 * project-core
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

module.exports = exports = require('./target/lib/index').default;
exports.ProjectCore = module.exports;

exports.utils = require('./target/lib/utils').default;

exports.Method = require('./target/lib/method').Method;
exports.MethodManager = require('./target/lib/method').MethodManager;
