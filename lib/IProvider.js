'use strict';

/** SMS Provider interface
 *
 * @param {Gateway} gateway
 *      Parent gatewway object
 * @param {String} alias
 *      Provider alias
 * @param {Object} config
 *      Provider configuration
 * @param {express} express
 *      Express app for the provider
 *
 * @constructor
 * @interface
 */
var IProvider = exports.IProvider = function(gateway, alias, config, express){
};

/** Send a message
 * This method modifies the message object with the extra data got from the provider
 * @param {OutgoingMessage} message
 *      The message to send
 * @returns {Q} promise for an OutgoingMessage
 */
IProvider.prototype.send = function(message){
};
