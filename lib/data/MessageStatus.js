'use strict';

/** Message Status Info
 *
 * @property {String} msgid
 *      Referenced message id
 *
 * @property {Boolean} accepted
 *      Accepted for delivery
 * @property {Boolean} delivered
 *      Delivered to the recipient
 *
 * @property {String?} error
 *      The error message (if any)
 *
 * @property {Object?} info
 *      Provider-dependent message info
 *
 * @constructor
 */
var MessageStatus = exports.MessageStatus = function(msgid){
    this.msgid = msgid;

    this.accepted = false;
    this.delivered = false;

    this.error = undefined;

    this.info = undefined;
};
