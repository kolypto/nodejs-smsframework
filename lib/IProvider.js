'use strict';

/** SMS Provider interface
 *
 * @param {String} alias
 *      Provider alias
 * @param {Object} config
 *      Provider configuration
 * @param {express} express
 *      Express app for the provider
 *
 * @fires {IProvider#msg-in} Incoming message.  Arguments: IncomingMessage
 * @fires {IProvider#msg-out} Outgoing message. Arguments: OutgoingMessage
 * @fires {IProvider#status} Status report.     Arguments: MessageStatus
 *
 * @constructor
 * @extends {events.EventEmitter}
 * @interface
 */
var IProvider = exports.IProvider = function(alias, config, express){
};

/** Send a message
 * @param {OutgoingMessage} message
 *      The message to send
 * @returns {Q} promise for an OutgoingMessage
 */
IProvider.prototype.send = function(message){
};
