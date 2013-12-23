'use strict';

/** Outgoing Message
 *
 * @property {String?} from
 *      Source number
 * @property {String} to
 *      Destination number
 * @property {String} body
 *      Message body
 *
 * @property {String?} provider
 *      Provider name
 * @property {Date} date
 *      Send date
 * @property {String?} msgid
 *      Message id, if available
 *
 * @property {Object} options
 *      Provider-dependent sending options.
 *      Some of them are standardized and described below.
 * @property {Boolean?} [options.allow_reply=true]
 *      Replies allowed?
 * @property {Boolean?} [options.status_report=false]
 *      Request a status report from the network
 * @property {Number?} options.expires
 *      Message validity period, minutes
 * @property {String?} options.senderId
 *      Sender ID to replace the number
 *
 * @property {Object?} info
 *      Provider-dependent message info (populated when the message is sent)
 * @property {MessageStatus?} status
 *      Delivery status (populated when a delivery report is received)
 *
 * @constructor
 */
var OutgoingMessage = exports.OutgoingMessage = function(to, body, options){
    this.from = undefined;
    this.to = to;
    this.body = body;

    this.provider = undefined;
    this.date = new Date();
    this.msgid = undefined;

    this.options = {
        allow_reply: true,
        status_report: false,
        expires: undefined,
        senderId: undefined
    };

    this.info = undefined;
    this.status = undefined;
};
