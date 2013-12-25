'use strict';

/** Error objects
 * @fileOverview
 */

var perror = require('perror')
    ;

/** Base error
 * @constructor
 * @inherits {Error}
 */
var SendMessageError = exports.SendMessageError = perror('SendMessageError');

exports.GenericError      = perror( 1, 'GenericError','Generic Provider Error',        SendMessageError);     // Generic error
exports.AuthError         = perror( 2, 'AuthError',   'Provider Authentication Error', exports.GenericError); // Authentication error
exports.LimitsError       = perror( 3, 'LimitsError', 'Provider Limits',               exports.GenericError); // Hit the limits
exports.CreditError       = perror( 4, 'CreditError', 'Provider Credit Error',         exports.GenericError); // Not enough money

exports.RequestError      = perror(40, 'RequestError',      'Request Error',          SendMessageError);     // Generic request error
exports.RequestSrcError   = perror(41, 'RequestSrcError',   'Invalid Source',         exports.RequestError); // source number
exports.RequestDstError   = perror(42, 'RequestDstError',   'Invalid Destination',    exports.RequestError); // destination number
exports.RequestParamError = perror(43, 'RequestParamError', 'Invalid Parameter',      exports.RequestError); // invalid parameter or its value

exports.ServerError       = perror(50, 'ServerError',       'Generic Server Error',   SendMessageError);     // sevice unavailable, etc
