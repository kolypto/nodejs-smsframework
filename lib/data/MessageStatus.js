'use strict';

/** Message Status Info
 *
 * @property {String} provider
 *      Provider alias
 * @property {String} msgid
 *      Referenced message id
 *
 * @property {Boolean} delivered
 *      Delivered to the recipient
 * @property {String?} error
 *      The error message (if any)
 *
 * @property {Object?} info
 *      Provider-dependent message info
 *
 * @constructor
 */
var MessageStatus = exports.MessageStatus = function(provider, msgid){
    this.provider = provider;
    this.msgid = msgid;

    this.delivered = false;
    this.error = undefined;

    this.info = undefined;
};
