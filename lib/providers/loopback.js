'use strict';

var express = require('express'),
    Q = require('q'),
    _ = require('lodash'),
    errors = require('../errors'),
    mdata = require('../data')
    ;

/** Loopback provider
 *
 * Sends messages to registered subscribers: see {LoopbackProvider#subscribe}
 *
 * @param {Object} config
 *      No configuration options are available
 *
 * @constructor
 * @inherits {IProvider}
 */
var LoopbackProvider = exports.LoopbackProvider = function(gateway, alias, config, webapp){
    this.gateway = gateway;
    this.alias = alias;
    this.config = config;

    /** Message id
     * @type {number}
     */
    this.msgid = 0;

    /** Virtual subscribers
     * @type {Object.<String, Function>}
     */
    this.subscribers = {};

    /** Message traffic
     * @type {Array.<IncomingMessage|OutgoingMessage>}
     */
    this.traffic = [];

    // Express
    var self = this;
    webapp.use(express.json());
    webapp.post('/receive', function(req, res){
        // Check input
        if (!req.body || !req.body.from || !req.body.body){
            res.json(400, { ok: 0, error: 'Incomplete' });
            return;
        }

        // Create IncomingMessage
        var im = _.extend(
            new mdata.IncomingMessage(
                alias,
                new Date(),
                req.body.from,
                req.body.to,
                req.body.body
            ),
            { msgid: ++self.msgid, info: {} }
        );

        // Receive it
        gateway.handleIncomingMessage(im)
            .then(function(){
                res.json({ ok: 1 });
            })
            .catch(function(err){
                res.json(500, { ok: 0, error: err })
            });
    });
};

//region Public API

/** Fetch the sent messages and reset
 * @returns {Array.<IncomingMessage|OutgoingMessage>}
 */
LoopbackProvider.prototype.getTraffic = function(){
    try {
        return this.traffic;
    } finally {
        this.traffic = [];
    }
};

/** Simulate an incoming message
 * @param {String} from
 *      Source number
 * @param {String} body
 *      Message text
 * @returns {Q} promise for message been processed
 */
LoopbackProvider.prototype.receive = function(from, body){
    var im = _.extend(
        new mdata.IncomingMessage(this.alias, new Date(), from, '', body),
        { msgid: ++this.msgid, info: {} }
    );
    this.traffic.push(im);
    return this.gateway.handleIncomingMessage(im);
};

/** Register a virtual subscriber which receives messages to the matching number.
 * @param {String} sim
 *      Subscriber phone number
 * @param {function(from:String, body:String, reply:function(String))} callback
 *      Messages receiver callback.
 *      The third argument is a function to send a response back to the server
 * @returns {LoopbackProvider}
 */
LoopbackProvider.prototype.subscribe = function(sim, callback){
    this.subscribers[sim] = callback;
    return this;
};

//endregion



//region IProvider

LoopbackProvider.prototype.send = function(message){
    // --- Send request --- //

    // Generate the message id
    var msgid = ++this.msgid;

    // Populate provider info
    message.info = {
        msgid: msgid
    };
    message.msgid = msgid;

    // Log
    this.traffic.push(message);

    // --- Send --- //

    // Deliver to the subscriber (if available)
    if (this.subscribers[message.to])
        this.subscribers[message.to](
            message.from,
            message.body,
            _.partial(this.receive.bind(this), message.to)
        );

    // --- Message sent --- //
    if (message.options.status_report)
        return this.gateway.handleMessageStatus(
            _.extend(
                new mdata.MessageStatus(this.alias, message.msgid),
                { delivered: true }
            )
        );

    return message;
};

//endregion
