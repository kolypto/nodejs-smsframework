[![Version](https://badge.fury.io/js/smsframework.png)](https://npmjs.org/package/smsframework)
[![Dependency Status](https://gemnasium.com/kolypto/nodejs-smsframework.png)](https://gemnasium.com/kolypto/nodejs-smsframework)
[![Build Status](https://travis-ci.org/kolypto/nodejs-smsframework.png?branch=master)](https://travis-ci.org/kolypto/nodejs-smsframework)

SMSframework
============

SMS framework with pluggable providers.

Key features:

* Send messages
* Receive messages
* Delivery confirmations
* Handle multiple providers with a single gateway
* Event-oriented
* Promise-based: using the [q](https://npmjs.org/package/q) package
* Unit-tested






Table of Contents
=================

* <a href="#supported-providers">Supported Providers</a>
* <a href="#gateway">Gateway</a>
    * <a href="#providers">Providers</a>
        * <a href="#gatewayaddproviderprovider-alias-config">Gateway.addProvider(provider, alias, config)</a>
        * <a href="#gatewayaddproviderproviders">Gateway.addProvider(providers)</a>
    * <a href="#sending-messages">Sending Messages</a>
    * <a href="#sending-errors">Sending Errors</a>
    * <a href="#events">Events</a>
        * <a href="#msg-out">msg-out</a>
        * <a href="#msg-sent">msg-sent</a>
        * <a href="#msg-in">msg-in</a>
        * <a href="#status">status</a>
        * <a href="#error">error</a>
* <a href="#data-objects">Data Objects</a>
    * <a href="#incomingmessage">IncomingMessage</a>
    * <a href="#outgoingmessage">OutgoingMessage</a>
    * <a href="#messagestatus">MessageStatus</a>
* <a href="#provider-http-receivers">Provider HTTP Receivers</a>
* <a href="#bundled-providers">Bundled Providers</a>
    * <a href="#loopbackprovider">LoopbackProvider</a>
* <a href="#message-routing">Message Routing</a> 






Supported Providers
===================

SMSframework supports the following

* [loopback](#loopbackprovider): loopback provider for testing. Bundled.
* [Vianett](https://npmjs.org/package/smsframework-vianett)
* [Clickatell](https://npmjs.org/package/smsframework-clickatell)

Also see the [full list of providers](https://npmjs.org/browse/keyword/smsframework).






Gateway
=======

SMSframework handles the whole messaging thing with a single *Gateway* object.

Let's start with initializing a gateway:

```js
var smsframework = require('smsframework')
    ;

var gateway = new smsframework.Gateway();
```

The `Gateway()` constructor currently has no arguments.



Providers
---------
A *Provider* is a package which implements the logic for a specific SMS provider.

Each provider reside in an individual package `smsframework-*`.
You'll probably want to install [some of these](#supported-providers) first.

### Gateway.addProvider(provider, alias, config)

Arguments:

* `provider: String` is the name of the provider package.
* `alias: String` is the provider alias: an arbitrary string that uniquely identifies the provider instance.
  You'll use this string in order to send messages via a specific provider.
* `config: Object` is the Provider-dependent configuration object.
  Refer to the provider documentation for the details.

When a package is `require()`d, it registers itself under the `smsframework.providers` namespace.
You don't need to require providers manually, as SMSframework does this for you.

```js
gateway.addProvider('provider1', 'alias1', {}); // package 'smsframework-provider1'
gateway.addProvider('provider2', 'alias2', {}); // package 'smsframework-provider2'
```

### Gateway.addProvider(providers)

An alternative syntax to add providers in bulk.

Arguments:

* `providers: Object` is an object that specifies multiple providers mapped to aliases:

    ```js
    {
        alias1: { provider: 'provider1', config: {} },
        alias2: { provider: 'provider2', config: {} }
    }
    ```

This works perfectly when your providers are defined in the configuration. Consider using [js-yaml](https://npmjs.org/package/js-yaml):

```yaml
providers:
    alias1:
        provider: provider1
        config:
            apitoken: '123465'
    alias2:
        provider: provider2
        config:
            apitoken: '987654'
```

Then, in the application:

```js
var config = yaml.load(fs.readFileSync('./config.yml', { encoding: 'utf8' }));
gateway.addProvider(config.providers);
```

### Gateway.getProvider(alias):IProvider
Get a provider instance by its alias.

You don't normally need this, unless the provider has some public API: see provider documentation.



Sending Messages
----------------

To send a message, you first create it with `Gateway.message(to, body)` which returns a fluid interface object.

Arguments:

* `to: String`: Recipient number
* `body: String`: Message body

Properties:

* `message: OutgoingMessage`: The wrapped Outgoing Message object

Methods:

* `send():Q`: Send the message.

    The method returns a promise for [OutgoingMessage](#outgoingmessage) which is resolved when a message is sent,
    or rejected on sending error. See [Handling Send Errors](#sending-errors).

* `from(from: String)`: Set the message originating number.

    Is used to pick a specific source number if the gateway supports that.

* `provider(provider: String)`: Choose the provider by alias.

    If no provider is specified - the first one is used to deliver the message.

* `options(options: OutgoingMessageOptions)`: Allows to specify sending options.

    This object can contain provider-specific options: refer to the provider documentation for the details.

    However, some of the options are standardized:

    * `allow_reply: Boolean`: Allow replies for this message. Default: `true`
    * `status_report: Boolean`: Request a delivery report. Default: `false`. See: [status](#status)
    * `expires: Number?`: Message validity period in minutes. Default: none.
    * `senderId: String?`: SenderID to replace the source number. Default: none.

        *NOTE*: This advanced feature is not supported by all providers! Moreover, some of them can have special restrictions.

All the above methods are optional, you can just send the message as is:

```js
gateway.message('+123456', 'hi there').send(); // using the 1st provider
```

Here's the full example:

```js
var smsframework = require('smsframework')
    ;

var gateway = new smsframework.Gateway();
gateway.addProvider('clickatell', 'primary', {});

gateway.message('+123456', 'hi there')
    .from('+1111')
    .provider('primary') // use the named provider
    .options({
        allow_reply: true,
        status_report: false,
        expires: 60,
        senderId: 'smsframework'
    })
    // Handle success
    .then(function(message){
        console.log('Message sent successfully!');
    })
    .catch(function(err){
        console.error('Failed to send the message', err.stack);
    });
```

If you dislike promises, you can always get back to the old good NodeJS-style callbacks:

```js
gateway.message('+123456', 'hi there').send()
    .nodeify(function(err, message){
        // NodeJS callback
    });
```


Sending Errors
--------------
When you `send()` a message, the promise may resolve to an error.

The error object is provided as an argument to the callback function, and can be one of the following:

* `Error`: unknown provider specified. You may have a typo, or the provider package is missing.
* `Error`: runtime error occurred somewhere in the code. Rare.
* `smsframework.errors.SendMessageError`: An advanced error object. Has the `code` field which defines the error
  conditions.

See [smsframework.errors.SendMessageError](lib/errors.js) for the list of supported error codes.

Example:

```js
gateway.message('+123456', 'hi there').send()
    .catch(function(err){
        if (err.code === smsframework.errors.SendMessageError.codes.GEN_CREDIT)
            console.error('Not enough funds:', err);
        else
            console.error(err.stack);
    });
```



Events
------

The `Gateway` object fires the following events:

### msg-out
Outgoing Message: a message is being sent.

Arguments:

* `message: OutgoingMessage`: The message being sent. See [OutgoingMessage](#outgoingmessage).

NOTE: It is not yet known whether the message was accepted by the Provider or not.
Also, the `msgid` and `info` fields are probably not populated.

### msg-sent
Outgoing Message: a message that was successfully sent.

Arguments:

* `message: OutgoingMessage`: The message being sent. See [OutgoingMessage](#outgoingmessage).

The message object is populated with the additional information from the provider, namely, the `msgid` and `info` fields.

### msg-in
Incoming Message: a message that was received from the provider.

Arguments:

* `message: IncomingMessage`: The received message. See [IncomingMessage](#incomingmessage).

### status
Message Status: a message status reported by the provider.

A status report is only delivered when explicitly requested with `options({ status_report: true })`.

Arguments:

* `status: MessageStatus`: The status info. See [MessageStatus](#messagestatus).

### error
Error object reported by the provider.

Arguments:

* `error: Error|SendMessageError`: The error object.

Useful to attach some centralized logging utility. Consider [winston](https://npmjs.org/package/winston) for this purpose.


Data Objects
============
SMSframework uses the following objects to represent message flows.

IncomingMessage
---------------
A messsage received from the provider.

Source: [lib/data/IncomingMessage.js](lib/data/IncomingMessage.js).

OutgoingMessage
--------------
A message being sent.

Source: [lib/data/OutgoingMessage.js](lib/data/OutgoingMessage.js).

MessageStatus
-------------
A status report received from the provider.

Source: [lib/data/MessageStatus.js](lib/data/MessageStatus.js).



Provider HTTP Receivers
=======================
The Gateway has an internal [express](https://npmjs.org/package/express) application, which is used by all providers
to register their receivers: HTTP endpoints used to interact with the SMS services.

Each provider is locked under the `/<alias>` prefix.
The resources are provider-dependent: refer to the provider documentation for the details.

To use the receivers in your application, use `Gateway.express()` method which returns an express middleware:

```js
var smsframework = require('smsframework'),
    express = require('express')
    ;

// Gateway
var gateway = new smsframework.Gateway();
gateway.addProvider('clickatell', 'primary', {}); // provider, alias 'primary'

// Init express
var app = express();
app.use('/sms', gateway.express()); // mount SMSframework middleware under /sms
app.listen(80); // start

// Ready to receive messages
gateway.on('msg-in', function(message){
    console.log('SMS from ' + message.from + ': ' + message.body);
});
```

Assuming that the provider declares a receiver as `'/receiver'`,
we now have a `'http://localhost:80/sms/primary/receiver'` path available.

In your Clickatell admin area, add this URL so Clickatell passes the incoming messages to us.



Bundled Providers
=================
The following providers are bundled with SMSframework and thus require no additional packages.

LoopbackProvider
----------------

Source: [lib/providers/loopback.js](lib/providers/loopback.js)

The `'loopback'` provider is used as a dummy for testing purposes.

It consumes all messages, supports delivery notifications,
and even has a `'/receiver'` HTTP receiver.

All messages flowing through it get incremental `msgid`s starting from 1.

### LoopbackProvider.getTraffic():Array.<IncomingMessage|OutgoingMessage>
LoopbackProvider stores all messages that go through it.
To get those messages, call `.getTraffic()`.

This method empties the message log.

```js
gateway.addProvider('loopback', 'lo', {});
gateway.message('+123', 'hi').send()
    .then(function(){
        gateway.getProvider('lo').getTraffic(); // array of messages
    });
```

### LoopbackProvider.receive(from, body):Q
Simulate an incoming message.

Arguments:

* `from: String`: Source number
* `body: String`: Message text

Returns: a promise for a message processed by SMSframework

```js
gateway.on('msg-in', function(message){
    console.log(message.from, ':', message.body);
});
gateway.getProvider('lo').receive('+1111', 'notification!');
```

### LoopbackProvider.subscribe(sim, callback)
Register a virtual subscriber which receives messages to the matching number.

Arguments:

* `sim: String`: Subscriber phone number
* `callback: function(from: String, body: String, reply:function(String):Q)`: A callback which gets the messages
  sent to this subscriber.

  The last argument is a convenience function to send a reply. It wraps `LoopbackProvider.receive()`.

```js
gateway.getProvider('lo').subscribe('+123456', function(from, body, reply){
    reply('Hi '+from+'!');
});
gateway.message('+123456', 'hi').send();
```


Message Routing
===============
SMSframework requires you to explicitly specify the provider for each message, or uses the first one.

In real world conditions with multiple providers, you may want a router function that decides on which provider to use
and which options to pick.

The idea is to implement a router function that receives 2 additional arguments:

* `module`: name of the sending module
* `type`: type of the message

These 2 arbitrary strings need to be standardized in the application code, thus offering the possibility to define
complex routing rules.

TODO: router
