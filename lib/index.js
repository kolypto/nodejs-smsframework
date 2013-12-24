'use strict';

exports.Gateway = require('./Gateway').Gateway;
exports.errors = require('./errors');
exports.data = require('./data');

exports.providers = require('./providers');


/** Register an SMS provider under ./providers
 * @param {String} name
 * @param {Function} Provider
 */
exports.registerProvider = function(name, Provider){
   exports.providers[name] = Provider;
};

/** Load provider packages
 * @param {..String} providers
 */
exports.loadProviders = function(/*...*/){
    for (var i = 0; i<arguments.length; i++)
        require('smsframework-' + arguments[i]);
    return exports;
};
