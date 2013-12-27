'use strict';

var express = require('express'),
    events = require('events'),
    util = require('util'),
    Q = require('q'),
    _ = require('lodash'),
    mdata = require('./data')
    ;

/** SMS Gateway
 *
 * @fires {Gateway#msg-in}   Incoming message.  Arguments: IncomingMessage
 * @fires {Gateway#msg-out}  Outgoing message.  Arguments: OutgoingMessage
 * @fires {Gateway#msg-sent} Sent message.      Arguments: OutgoingMessage
 * @fires {Gateway#status}   Status report.     Arguments: MessageStatus
 * @fires {Gateway#error}    Errors.            Arguments: Error
 *
 * @constructor
 * @extends {events.EventEmitter}
 */
var Gateway = exports.Gateway = function(){
    /** Registered providers
     * @type {Object.<String, IProvider>}
     * @protected
     */
    this._providers = {};

    /** Express application for SMS receivers
     * @type {express}
     * @protected
     */
    this._express = express();
    this._express.use(express.json());
    this._express.use(express.urlencoded());

    /** Router function to decide which provider to use
     * @param {OutgoingMessage} om
     * @param {..args} values
     * @type {function(OutgoingMessage, ...values):String?}
     * @protected
     */
    this._router = undefined;

    /** Functional handlers
     * @type {{message: Array, status: Array}}
     * @protected
     */
    this._receivers = {
        message: [],
        status: []
    };
};
util.inherits(Gateway, events.EventEmitter);



//region Providers

/** Add a provider class.
 * Its receivers will be available under /<alias>/: see provider documentation.
 * @param {Function} Provider
 *      Provider constructor
 * @param {String} alias
 *      Provider alias
 * @param {Object} config
 *      Provider-dependent configuration
 * @returns {Gateway}
 */
Gateway.prototype.addProviderClass = function(Provider, alias, config){
    // Express
    var app = express();
    this._express.use('/'+alias, app);

    // Provider
    var provider = (function(constructor, args){
        // see: http://stackoverflow.com/a/14378462/134904
        var instance = Object.create(constructor.prototype);
        var result = constructor.apply(instance, args);
        return typeof result === 'object' ? result : instance;
    })(Provider, [ this, alias, config || {}, app ]);

    // Receivers
    var self = this;

    // Finish
    this._providers[alias] = provider;
    return this;
};

/** Add a provider by name.
 * Attempts to load a provider if it's not registered yet
 *
 * Usage:
 *      addProvider(name, alias, config);
 *      addProvider([ { alias: alias, provider: name, config: config }, ... ])
 *
 * @param {String|Object.<String, { provider: String, config: Object }>} provider
 *      Provider name ( from ./providers )
 *      OR an object of providers
 * @param {String} alias
 *      Provider alias
 * @param {Object} config
 *      Provider-dependent configuration
 * @returns {Gateway}
 */
Gateway.prototype.addProvider = function(provider, alias, config){
    // footprint: addProvider(providers)
    if (_.isArray(provider)){
        var self = this;
        _.each(provider, function(data){
            if (!data.provider || !data.alias)
                throw new Error('Provider config: missing required fields');
            self.addProvider(data.provider, data.alias, data.config);
        });
        return this;
    }

    // footprint: addProvider(provider, alias, config)
    var providers = require('./providers');
    if (!(provider in providers))
        try { require('../').loadProviders(provider); } // attempt to load a provider
        catch(e){}

    var Provider = providers[provider];
    if (_.isUndefined(Provider))
        throw new Error('Unknown provider name: ' + provider);

    // Add provider
    return this.addProviderClass(Provider, alias, config);
};

/** Get a provider by alias
 * You don't normally need this, unless the provider has some public API: see provider documentation.
 * @param {String} alias
 *      Provider alias
 * @returns {IProvider?}
 */
Gateway.prototype.getProvider = function(alias){
    return this._providers[alias];
};

//endregion



//region Helpers

/** Helper to promise a listening Express app
 * @param {express} app
 * @param {Array} listen
 * @returns {Q} promise for a server
 * @protected
 */
Gateway._listenExpress = function(app, listen){
    return Q.promise(function(resolve, reject, notify){
        var server = app.listen.apply(app, _.toArray(listen).concat(function(){
            resolve(server);
        }));
        server.on('error', function(err){
            reject(err);
        });
    });
};

//endregion



//region Provider Integration

/** (Internal method used by providers)
 * Handle an Incoming Message.
 *
 * If this method fails (by returning a rejection), the provider MUST report an error back to the service.
 *
 * @param {IncomingMessage} message
 *      The message to handle
 * @returns {Q} promise
 *      When the handler fails, provider should report an error to the service
 * @protected
 */
Gateway.prototype.handleIncomingMessage = function(message){
    var self = this;
    return [
        // Emit 'msg-in'
        function(){
            self.emit('msg-in', message);
        },
        // Execute functional handlers
        function(){
            return Q.all(_.invoke(self._receivers.message, 'call', undefined, message));
        }
    ].reduce(Q.when, Q(1))
        // Emit 'error' & throw
        .catch(function(err){
            self.emit('error', err);
            throw err;
        });
};

/** (Internal method used by providers)
 * Handle a message Status.
 *
 * If this method fails (by returning a rejection), the provider MUST report an error back to the service.
 *
 * @param {MessageStatus} status
 *      Status of some outgoing message
 * @returns {Q} promise
 *      When the handler fails, provider should report an error to the service
 * @protected
 */
Gateway.prototype.handleMessageStatus = function(status){
    var self = this;
    return [
        // Emit 'status'
        function(){
            self.emit('status', status);
        },
        // Execute functional handlers
        function(){
            return Q.all(_.invoke(self._receivers.status, 'call', undefined, status));
        }
    ].reduce(Q.when, Q(1))
        // Emit 'error' & throw
        .catch(function(err){
            self.emit('error', err);
            throw err;
        });
};

/** (Internal method used by providers)
 * Handle an external error which is not related to a message: like no credits, server erorrs, etc.
 *
 * @param {Error|SendMessageError} err
 *      The error object
 */
Gateway.prototype.handleError = function(err){
    this.emit('error', err);
};

//endregion



//region Send

/** Send a message
 * This is a low-level interface that requires you to prepare an OutgoingMessage object
 * @param {OutgoingMessage} message
 *      The message to send.
 *      If no provider is chosen - the first one is used
 * @returns {Q} promise for {OutgoingMessage}
 * @throws {Error} Unknown provider alias (promised)
 * @throws {Error} Invalid outgoing message (promised)
 */
Gateway.prototype.sendMessage = function(message){
    var self = this;
    return [
        // Default provider
        function(){
            if (_.isUndefined(message.provider)){
                if (self._router)
                    message.provider = self._router.apply(self, [message].concat(message.routingValues || []));
                else
                    message.provider = _.keys(self._providers)[0]; // use the default
            }
        },
        // Emit 'msg-out'
        function(){
            self.emit('msg-out', message);
        },
        // Send it
        function(){
            // Provider
            var provider = self._providers[message.provider];
            if (!provider)
                throw new Error('Unknown provider alias: ' + message.provider);

            // Send it
            return Q(provider.send(message))
                // Emit errors
                .catch(function(err){
                    self.emit('error', err); // emit
                    throw err; // Throw it further
                });
        },
        // Emit 'msg-sent'
        function(message){
            self.emit('msg-sent', message);
            return message;
        },
    ].reduce(Q.when, Q(1));
};

/** @typedef {{
*           message:    OutgoingMessage,
*           send:       function():Q,
*           from:       function(String):OutgoingMessageConstructor,
*           provider:   function(String):OutgoingMessageConstructor,
*           route:      function(...*):OutgoingMessageConstructor,
*           options:    function(OutgoingMessageOptions):OutgoingMessageConstructor
*           params:     function(Object):OutgoingMessageConstructor
*       }} OutgoingMessageConstructor
*/

/** Initiate a chained message constructor
 * @param {String} to
 *      Message destination
 * @param {String} body
 *      Message text
 * @returns {OutgoingMessageConstructor}
 */
Gateway.prototype.message = function(to, body){
    var self = this;

    return {
        /** The wrapped Outgoing Message object
         * @type {OutgoingMessage}
         */
        message: new mdata.OutgoingMessage(to, body),

        /** Send the created message
         * @returns {Q}
         */
        send: function(){
            return self.sendMessage(this.message);
        },

        /** Set the message 'from' field
         * Is used to pick a specific source number if the gateway supports that
         * @param {String} from
         *      Source number
         * @returns {OutgoingMessageConstructor}
         */
        from: function(from){
            this.message.from = from;
            return this;
        },

        /** Choose the provider by alias
         * If no provider is specified - the first one is used to deliver the message.
         * @param {String} provider
         *      Provider alias
         * @returns {OutgoingMessageConstructor}
         */
        provider: function(provider){
            this.message.provider = provider;
            return this;
        },

        /** Add routing values to the message
         * @param {..args} values
         *      Arbitrary values handled by the router function.
         *      See: {Gateway#router}
         * @returns {OutgoingMessageConstructor}
         */
        route: function(/*...*/){
            this.message.routingValues = _.toArray(arguments);
            return this;
        },

        /** Add message options
         * @param {OutgoingMessageOptions} options
         *      Sending options.
         * @returns {OutgoingMessageConstructor}
         */
        options: function(options){
            _.extend(this.message.options, options);
            return this;
        },
        /** Add provider-dependent parameters
         * @param {Object} params
         * @returns {OutgoingMessageConstructor}
         */
        params: function(params){
            _.extend(this.message.params, params);
            return this;
        }
    };
};

/** Set the router function
 * @param {function(OutgoingMessage, ..values):String?} router
 *      A function which gets an outgoing message + some additional routing values, and decides on the provider to use.
 * @returns {Gateway}
 */
Gateway.prototype.setRouter = function(router){
    this._router = router;
    return this;
};

//endregion



//region Functional Handlers

/** Subscribe a callback to Incoming Messages.
 * Can be called multiple times.
 * @param {function(IncomingMessage):Q} callback
 *      A callback that processes an Incoming Message.
 *      If it returns a rejection - the Provider reports an error to the SMS service.
 * @returns {Gateway}
 */
Gateway.prototype.receiveMessage = function(callback){
    this._receivers.message.push(callback);
    return this;
};

/** Subscribe a callback to Message Statuses.
 * Can be called multiple times.
 * @param {function(MessageStatus):Q?} callback
 *      A callback that processes a Message Status.
 *      If it returns a rejection - the Provider reports an error to the SMS service.
 * @returns {Gateway}
 */
Gateway.prototype.receiveStatus = function(callback){
    this._receivers.status.push(callback);
    return this;
};

//endregion



//region HTTP

/** Get Express middleware that handles HTTP endpoints for the registered providers.
 * Each provider is mounted on "/<alias>/".
 * Endpoints are provider-dependent: see provider documentation.
 * @returns {express}
 */
Gateway.prototype.express = function(){
    return this._express;
};

/** Sugar to make the Gateway listen on the specified address
 * listen(port[, host])
 * listen(path)
 * listen(handle)
 * @returns {Q} promise for an {http.Server}
 *      Use server.close() to stop it
 *      Use server.address().port to get the port number
 */
Gateway.prototype.listen = function(/*...*/){
    return Gateway._listenExpress.call(undefined, this.express(), arguments);
};

//endregion
