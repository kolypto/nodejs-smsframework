'use strict';

var Q = require('q'),
    smsfw = require('../')
    ;

/** Test LogProvider
 * @param {test|deepEqual} test
 */
exports.testLogProvider = function(test){
    var log = [];

    var gw = new smsfw.Gateway;
    gw.addProvider('log', 'log', {
        log: function(message){
            log.push(message.to + ': ' + message.body);
        }
    });

    Q.all([
        gw.message('+123', 'hey').send(),
        gw.message('+456', 'hi').send(),
        gw.message('+789', 'yo').send(),
    ]).then(function(){
            test.strictEqual(log.length, 3);
            test.strictEqual(log[0], '+123: hey');
            test.strictEqual(log[1], '+456: hi');
            test.strictEqual(log[2], '+789: yo');
        })
        .catch(function(err){ test.ok(false, err.stack); })
        .finally(function(){ test.done(); });
};
