'use strict';

var express = require('express'),
    Q = require('q'),
    _ = require('lodash')
    ;

/** SMS Gateway
 * @constructor
 */
var Gateway = exports.Gateway = function(){
    /** Registered providers
     * @type {Object.<String, IProvider>}
     * @protected
     */
    this._providers = {};

    /** Express application for SMS receivers
     * @type {express}
     * @protected
     */
    this._express = express();
};

//region Providers

/** Add a provider class.
 * Its receivers will be available under /<alias>/: see provider documentation.
 * @param {Function} Provider
 *      Provider constructor
 * @param {String} alias
 *      Provider alias
 * @param {Object} config
 *      Provider-dependent configuration
 * @returns {Gateway}
 */
Gateway.prototype.addProviderClass = function(Provider, alias, config){
    // Express
    var app = express();
    this._express.use(alias, app);

    // Provider
    var provider = (function(constructor, args){
        // see: http://stackoverflow.com/a/14378462/134904
        var instance = Object.create(constructor.prototype);
        var result = constructor.apply(instance, args);
        return typeof result === 'object' ? result : instance;
    })(Provider, [ config, app ]);

    // Receivers
    var self = this;

    // Finish
    this._providers[alias] = provider;
    return this;
};

/** Add a provider by name
 *
 * Usage:
 *      addProvider(name, alias, config);
 *      addProvider({ alias: { provider: name, config: config } })
 *
 * @param {String|Object.<String, { provider: String, config: Object }>} provider
 *      Provider name ( from ./providers )
 *      OR an object of providers
 * @param {String} alias
 *      Provider alias
 * @param {Object} config
 * @returns {Gateway}
 */
Gateway.prototype.addProvider = function(provider, alias, config){
    // footprint: addProvider(providers)
    if (_.isObject(provider)){
        var self = this;
        _.each(provider, function(data, alias){
            self.addProvider(data.provider, alias, data.config);
        });
        return this;
    }

    // footprint: addProvider(provider, alias, config)
    var Provider = require('./providers')[provider];
    if (_.isUndefined(Provider))
        throw new Error('Unknown provider name: ' + provider);
    return this.addProviderClass(Provider, alias, config);
};

/** Get a provider by alias
 * You don't need this, unless the provider has some public API: see provider documentation.
 * @param {String} alias
 *      Provider alias
 * @returns {IProvider?}
 */
Gateway.prototype.getProvider = function(alias){
    return this._providers[alias];
};

//endregion
