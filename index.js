/**
 * project-core
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

module.exports = exports = require('./dist/lib/index').default;
exports.ProjectCore = module.exports;

exports.utils = require('./dist/lib/utils').default;

exports.Method = require('./dist/lib/method').Method;
exports.MethodManager = require('./dist/lib/method').MethodManager;
