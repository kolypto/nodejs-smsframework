'use strict';

/** SMS Provider interface
 *
 * @param {Gateway} gateway
 *      Parent gatewway object
 * @param {String} alias
 *      Provider alias
 * @param {Object} config
 *      Provider configuration
 * @param {express} webapp
 *      Express web app for the provider
 *
 * @constructor
 * @interface
 */
var IProvider = exports.IProvider = function(gateway, alias, config, webapp){
};

/** Send a message
 * This method modifies the message object with the extra data got from the provider: `msgid` and `info`.
 *
 * Providers are required to:
 *   * Consume any phone number format, with or without leading '+'
 *   * Set `message.msgid` on completion
 *
 * @param {OutgoingMessage} message
 *      The message to send
 * @returns {Q} promise for an OutgoingMessage
 *      Errors should be and instance of `SendMessageError` and get back as rejections
 */
IProvider.prototype.send = function(message){
};
