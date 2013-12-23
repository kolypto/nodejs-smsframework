'use strict';

/** Outgoing Message
 *
 * @property {String?} from
 *      Source number
 *      Is used to pick a specific source number if the gateway supports that
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
 *      Message id, if available.
 *      Is populated by the provider on send
 *
 * @property {OutgoingMessageOptions} options
 *      Provider-dependent sending options.
 *      Some of them are standardized and described below.
 *
 * @property {Object?} info
 *      Provider-dependent message info (populated when the message is sent)
 *
 * @constructor
 */
var OutgoingMessage = exports.OutgoingMessage = function(to, body){
    this.from = undefined;
    this.to = to;
    this.body = body;

    this.provider = undefined;
    this.date = new Date();
    this.msgid = undefined;

    this.options = new OutgoingMessageOptions();

    this.info = undefined;
};



/** Provider-dependent sending options.
 * Some of them are standardized and described below:
 *
 * @property {Boolean?} [allow_reply=true]
 *      Replies allowed?
 * @property {Boolean?} [status_report=false]
 *      Request a status report from the network
 * @property {Number?} expires
 *      Message validity period, minutes
 * @property {String?} senderId
 *      Sender ID to replace the number
 *
 * @type {OutgoingMessageOptions}
 */
var OutgoingMessageOptions = exports.OutgoingMessageOptions = function(){
    this.allow_reply = true;
    this.status_report = false;
    this.expires = undefined;
    this.senderId = undefined;
};
