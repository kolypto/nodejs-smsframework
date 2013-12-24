'use strict';

var request = require('request'),
    Q = require('q'),
    _ = require('lodash'),
    smsframework = require('../')
    ;

/** Test the LoopbackProvider in real conditions
 * @param {test|assert} test
 */
exports.testLoopbackProvider = function(test){
    // Create a gateway with 2 providers
    var gw = new smsframework.Gateway();
    gw.addProvider('loopback', 'lo0', {});
    gw.addProvider('loopback', 'lo1', {});

    // Test structure
    test.deepEqual( _.keys(gw._providers), ['lo0', 'lo1'] );

    // Create some subscribers
    var subscriber_log = [];

    gw.getProvider('lo0').subscribe('+1', function(from, body, reply){
        subscriber_log.push( '+1:'+from+':'+body );
    });

    gw.getProvider('lo1').subscribe('+echo', function(from, body, reply){
        subscriber_log.push( '+echo:'+from+':'+body );
        reply(body+' rocks!');
    });

    var gw_events = [];
    gw.on('msg-in', function(){ gw_events.push('msg-in'); });
    gw.on('msg-out', function(){ gw_events.push('msg-out'); });
    gw.on('status', function(){ gw_events.push('status'); });
    gw.on('error', function(){ gw_events.push('error'); });

    [
        // Send through an unknown gateway
        function(){
            gw_events = [], subscriber_log = [];
            return gw.message('+???', 'hello?').provider('?').send()
                .then(function(){ test.ok(false); })
                .catch(function(e){
                    // Expected error
                    test.ok(e instanceof Error);
                    test.strictEqual(e.message, 'Unknown provider alias: ?');

                    // Test events
                    test.deepEqual(gw_events, [ 'msg-out' ]);
                });
        },
        // Send a message to some recipient
        function(){
            gw_events = [], subscriber_log = [];
            return gw.message('+???', 'hello?').send()
                .then(function(){
                    // Test traffic
                    var lo0_t = gw.getProvider('lo0').getTraffic(),
                        lo1_t = gw.getProvider('lo1').getTraffic()
                        ;

                    test.strictEqual(1, lo0_t.length);
                    test.strictEqual(0, lo1_t.length);

                    // Test message contents
                    test.deepEqual(
                        _.omit(lo0_t[0], 'date'),
                        {
                            from: undefined,
                            to: '+???',
                            body: 'hello?',
                            provider: 'lo0',
                            msgid: 1,
                            routingValues: undefined,
                            options: { allow_reply: true, status_report: false, expires: undefined, senderId: undefined },
                            params: {},
                            info: { msgid: 1 }
                        }
                    );

                    // Test events
                    test.deepEqual(gw_events, [ 'msg-out' ]);
                });
        },
        // Send to subscriber #1, with status report
        function(){
            gw_events = [], subscriber_log = [];
            return gw.message('+1', 'hello?').options({ status_report: true }).send()
                .then(function(){
                    // Test subscriber logs
                    test.deepEqual(subscriber_log, [ '+1:undefined:hello?' ]); // GW has no outgoing address, so it's fine

                    // Test events
                    test.deepEqual(gw_events, [ 'msg-out', 'status' ]);
                });
        },
        // Catch a reply from the echo subscriber
        function(){
            gw_events = [], subscriber_log = [];
            gw.getProvider('lo0').getTraffic();
            gw.getProvider('lo1').getTraffic();

            return gw.message('+echo', 'kolypto').provider('lo1').send()
                .then(function(){
                    // Test subscriber logs
                    test.deepEqual(subscriber_log, [ '+echo:undefined:kolypto' ]);

                    // Test events
                    test.deepEqual(gw_events, [ 'msg-out', 'msg-in' ]);

                    // Test traffic
                    var t = gw.getProvider('lo1').getTraffic();
                    test.strictEqual(t.length, 2);
                    test.deepEqual(
                        _.omit(t[0], 'date'),
                        {
                            from: undefined,
                            to: '+echo',
                            body: 'kolypto',
                            provider: 'lo1',
                            msgid: 1,
                            routingValues: undefined,
                            options: { allow_reply: true, status_report: false, expires: undefined, senderId: undefined },
                            params: {},
                            info: { msgid: 1 }
                        }
                    );

                    test.deepEqual(
                        _.omit(t[1], 'date'),
                        {
                            from: '+echo',
                            to: '',
                            body: 'kolypto rocks!',
                            provider: 'lo1',
                            msgid: 2,
                            info: {}
                        }
                    );
                });
        },
        // Test express receiver
        function(){
            gw_events = [], subscriber_log = [];

            // Catch the incoming msg
            var msg_in;
            gw.on('msg-in', function(msg){
                msg_in = msg;
            });

            // HTTP Listen
            var listening = Q.defer();
            var port;

            var server = gw.express().listen(0, 'localhost', function(){
                listening.resolve();
                port = server.address().port;
            });

            // Simulate an incoming message
            return listening.promise
                .then(function(){
                    test.ok(port > 0);

                    return Q.promise(function(resolve, reject, notify){
                        // Make a request
                        request({
                            url: 'http://localhost:'+port+'/lo0/receive',
                            method: 'POST',
                            json: { from: '123', body: 'hi there' }
                        }, function(err, res, body){
                            if (err)
                                reject(err);
                            else if (res.statusCode !== 200){
                                if (_.isObject(body))
                                    resolve(body);
                                else
                                    reject(new Error(body));
                            }
                            else
                                resolve(body);
                        })
                    });
                })
                // Check results
                .then(function(body){
                    // Check response
                    test.deepEqual(body, { ok: 1 });

                    // Check events
                    test.deepEqual(gw_events, ['msg-in']);

                    // Check message
                    test.deepEqual(
                        _.omit(msg_in, 'date'),
                        { from: '123', to: undefined, body: 'hi there', provider: 'lo0', msgid: 3, info: {} }
                    );
                })
                .finally(function(){
                    server.close();
                });
        },
        // Test router function
        function(){
            gw.setRouter(function(om, module, type){
                if (module === 'test' && type === 'notify')
                    return 'lo1';
                return 'lo0';
            });

            return Q.all([
                gw.message('+999', 'hi').route('test', 'lol').send()
                    .then(function(message){ test.strictEqual(message.provider, 'lo0'); }),
                gw.message('+999', 'hi').route('test', 'notify').send()
                    .then(function(message){ test.strictEqual(message.provider, 'lo1'); })
            ]);
        }
    ].reduce(Q.when, Q(1))
        .catch(function(err){ test.ok(false, err.stack); })
        .finally(function(){ test.done(); });
};
