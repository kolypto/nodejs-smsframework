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
 * @property {String} status
 *      Message status: see {MessageStatus.statuses}
 * @property {String} statusText
 *      Message status text from the provider
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

    this.status = '';
    this.statusText = undefined;

    this.info = {};
};

/** Set the status and statusText.
 * On 'OK' and 'SENT', set delivered=true
 * On 'ERR', set error=statusText
 * @param status
 * @param statusText
 */
MessageStatus.prototype.setStatus = function(status, statusText){
    this.status = status;
    this.statusText = statusText;

    this.delivered = status === 'OK' || status === 'SENT';
    this.error = (status === 'ERR')? this.statusText : undefined;
};

/** Statuses
 * @type {Object.<String, String>}
 */
MessageStatus.statuses = {
    'UNK':      'Unknown',          // Unknown status
    'ERR':      'Error occurred',   // Delivery error
    'SENDING':  'Sending',          // In progress
    'OK':       'Success',          // Generic success
    'SENT':     'Sent',             // Sent to the recepient
    'EXPIRED':  'Expired'           // Expired
};
