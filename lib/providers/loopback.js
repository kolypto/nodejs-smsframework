'use strict';

var util = require('util'),
    events = require('events'),
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
 * @param {Boolean} [config.allow_unknown=true]
 *      Silently accept messages to unknown subscribers
 *
 * @constructor
 * @inherits {IProvider}
 */
var LoopbackProvider = exports.LoopbackProvider = function(alias, config, express){
    this.config = _.defaults(config, {
        allow_unknown: true
    });

    /** Message id
     * @type {number}
     */
    this.msgid = 0;

    /** Virtual subscribers
     * @type {Object.<String, Function>}
     */
    this.subscribers = {};

    // Express
    var self = this;
    express.post('/receiver', function(req, res){
        if (!req.body.body){
            res.json(400, { error: 'Incomplete' });
            return;
        }

        var im = new mdata.IncomingMessage(
            alias,
            new Date(),
            req.body.from,
            req.body.to,
            req.body.body
        );
        im.msgid = ++self.msgid;
        im.info = {};

        self.receive(im);

        res.json({ ok: 1 });
    });
};
util.inherits(LoopbackProvider, events.EventEmitter);

//region Public API

/** Simulate an incoming message
 * @param {IncomingMessage} message
 * @returns {LoopbackProvider}
 */
LoopbackProvider.prototype.receive = function(message){
    this.emit('msg-in', message);
    return this;
};

/** Register a virtual subscriber which receives messages to a callback
 * @param {String} sim
 *      Subscriber phone number
 * @param {function(OutgoingMessage)} callback
 *      Messages receiver callback
 * @returns {LoopbackProvider}
 */
LoopbackProvider.prototype.subscribe = function(sim, callback){
    this.subscribers[sim] = callback;
    return this;
};

//endregion

/**
 * @param {OutgoingMessage} message
 * @returns {Q}
 */
LoopbackProvider.prototype.send = function(message){
    var self = this;

    // Check subscriber
    if (!this.config.allow_unknown && !(message.to in this.subscribers))
        throw new errors.SendMessageError(
            SendMessageError.codes.REQ_DST_NUMBER,
            'Unknown destination number'
        );

    // --- Send request --- //
    var msgid = ++this.msgid;

    // Populate provider info
    message.info = {
        msgid: msgid
    };
    message.msgid = msgid;

    // Emit 'msg-out'
    this.emit('msg-out', message);

    // --- Message queued --- //
    var status = _.extend(new mdata.MessageStatus(message.msgid), {
        accepted: true,
        delivered: false
    });

    // Emit 'status': queued
    this.emit('status', _.extend(status, { accepted: true }));

    // --- Send --- //

    if (this.subscribers[message.to])
        this.subscribers[message.to](message);

    // --- Message sent --- //
    this.emit('status', _.extend(status, { delivered: true }));
};
