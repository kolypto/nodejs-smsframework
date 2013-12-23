'use strict';

/** Incoming Message
 *
 * @property {String} from
 *      Source number
 * @property {String} to
 *      Destination number
 * @property {String} body
 *      Message body
 *
 * @property {String} provider
 *      Provider alias
 * @property {Date} date
 *      Send date
 * @property {String?} msgid
 *      Message id, if available
 *
 * @property {Object?} info
 *      Provider-dependent message info
 *
 * @constructor
 */
var IncomingMessage = exports.IncomingMessage = function(provider, date, from, to, body){
    this.from = from;
    this.to = to;
    this.body = body;

    this.provider = provider;
    this.date = date;
    this.msgid = undefined;

    this.info = undefined;
};
