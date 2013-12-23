'use strict';

/** SMS Provider interface
 *
 * @param {Object} config
 *      Provider configuration
 * @param {express} express
 *      Express app for the provider
 *
 * @fires {IProvider#message}
 * @fires {IProvider#delivery}
 *
 * @constructor
 * @extends {events.EventEmitter}
 * @interface
 */
var IProvider = exports.IProvider = function(config, express){
};

IProvider.prototype.send = function(){
};
