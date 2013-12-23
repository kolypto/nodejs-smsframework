'use strict';

/** Error objects
 * @fileOverview
 */

var util = require('util')
    ;

/** Send Message Error
 *
 * @param {Number} code
 *      Error code. See: {SendMessageError.codes}
 * @param {String} message
 *      Error message
 *
 * @constructor
 * @extends {Error}
 */
var SendMessageError = exports.SendMessageError = function(code, message){
    Error.call(this, message);
    Error.captureStackTrace(this, this.constructor);
    this.code = code;
    this.message = ({
        1: 'Generic error',
        2: 'Authentication error',
        3: 'Limits',
        4: 'No credits left',
        40: 'Request error',
        41: 'Invalid source number',
        42: 'Invalid destination number',
        50: 'Server error'
    }[code] || ( '#'+code )) + ': ' + message;
};
util.inherits(SendMessageError, Error);
SendMessageError.prototype.name = 'SendMessageError';

SendMessageError.codes = {
    // Generic errors
    GEN_ERROR: 1, // Generic error
    GEN_AUTH: 2, // Authentication error
    GEN_LIMITS: 3, // Limits
    GEN_CREDIT: 4, // No credits left

    // Request errors
    REQ_ERROR: 40, // Generic request error
    REQ_SRC_NUMBER: 41, // Invalid source number
    REQ_DST_NUMBER: 42, // Invalid destination number

    // Server errors
    SERVER_ERROR: 50 // Generic server error
};
