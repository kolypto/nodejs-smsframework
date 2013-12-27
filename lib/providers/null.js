'use strict';

/** Null provider
 *
 * Ignores everything :)
 *
 * @constructor
 * @inherits {IProvider}
 */
var NullProvider = exports.NullProvider = function(gateway, alias, config, webapp){
    this._msgid = 0;
};

//region IProvider

NullProvider.prototype.send = function(message){
    message.msgid = ++this._msgid;
    return message;
};

//endregion
