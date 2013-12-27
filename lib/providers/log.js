'use strict';

var _ = require('lodash')
    ;

/** Log provider
 *
 * Just logs the messages being sent
 *
 * @param {function(OutgoingMessage)} config.log
 *      Logger function. Default: 'console.log'
 *
 * @constructor
 * @inherits {IProvider}
 */
var LogProvider = exports.LogProvider = function(gateway, alias, config, webapp){
    this.gateway = gateway;
    this.alias = alias;
    this.config = _.defaults(config, {
        log: function(message){
            console.log('SMS to', message.to, ': ', message.body);
        }
    });
    this._msgid = 0;
};

//region IProvider

LogProvider.prototype.send = function(message){
    message.msgid = ++this._msgid;
    this.config.log(message);
    return message;
};

//endregion
