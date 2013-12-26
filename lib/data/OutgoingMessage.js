'use strict';

/** Outgoing Message
 *
 * @property {String?} from
 *      Source number
 *      Is used to pick a specific source number if the gateway supports that.
 *
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
 * @property {Array?} routing
 *      Routing values associated with the message.
 *      See: {Gateway#message}
 *
 * @property {OutgoingMessageOptions} options
 *      Sending options
 * @property {Object} params
 *      Provider-dependent parameters
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
    this.routingValues = undefined;

    this.options = new OutgoingMessageOptions();
    this.params = {};

    this.info = {};
};



/** Sending Options
 *
 * @property {Boolean?} [allow_reply=false]
 *      Replies allowed?
 * @property {Boolean?} [status_report=false]
 *      Request a status report from the network
 * @property {Number?} expires
 *      Message validity period, minutes
 * @property {String?} senderId
 *      Sender ID to replace the number
 * @property {Boolean} [escalate=false]
 *      Is a high-pri message: these are delivered faster and costier.
 *
 * @type {OutgoingMessageOptions}
 */
var OutgoingMessageOptions = exports.OutgoingMessageOptions = function(){
    this.allow_reply = false;
    this.status_report = false;
    this.expires = undefined;
    this.senderId = undefined;
    this.escalate = false;
};
