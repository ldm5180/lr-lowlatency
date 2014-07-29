"use strict";
var http = require('http');
var vsm = require('lrs/virtualServerModule');

function handleReq(srvReq, srvRes, cliReq) {
    var timer;

    // Keep track of the responder. If the responder is set, then only that
    // responder should continue.
    var responder = '';

    // Store the request to later send to a backup server.
    var backupCliReqData = { host: '127.0.0.1',
                             method: srvReq.method,
                             port: 8080,
                             headers: srvReq.headers,
                             data: '' };

    // If the server response is received before the backup, cancel the timer
    // and send the response.
    srvReq.on('response', function(cliRes) {
        cliRes.on('data', function(data) {
            clearTimeout(timer);
            if (responder == '' || responder == 'original') {
                responder = 'original';
                srvRes.write(data);
            }
        });
        cliRes.on('end', function(data) {
            clearTimeout(timer);
            if (responder == '' || responder == 'original') {
                console.log('Response from original server.');
                responder = 'original';
                srvRes.end(data);
            }
        });
    });

    // "Slow" pipe the request to the normal server and cache it so it can be
    // sent to the backup if needed.
    srvReq.bindHeaders(cliReq);
    srvReq.on('data', function(data) {
        backupCliReqData['data'] += data;
        cliReq.write(data);
    });
    srvReq.on('end', function(data) {
        cliReq.end(data);
        // Now that the entire request has been received and sent to the
        // server start the timer.
        timer = setTimeout(function() {
            backupCliReqData['data'] += data;
            // Create the backup request object.
            var backupCliReq = http.request({
                host: backupCliReqData['host'],
                method: backupCliReqData['method'],
                port: backupCliReqData['port'],
                headers: backupCliReqData['headers'],
            }, function (cliRes) {
                // Handle the backup client response. If this response comes in
                // before the original then set the responder and write the
                // data to the server response object.
                cliRes.on('data', function(data) {
                    if (responder == '' || responder == 'backup') {
                        responder = 'backup';
                        srvRes.write(data);
                    }            
                }); 
                cliRes.on('end', function(data) {
                    if (responder == '' || responder == 'backup') {
                        console.log('Response from backup server.');
                        responder = 'backup';
                        srvRes.end(data);
                    }            
                });
            });
            // Send the request data and end it.
            backupCliReq.end(backupCliReqData['data'] + data);
        }, 1000); // 1 sec is probably longer than desired, but useful for demo
    });
    srvReq.on('error', function(err) {
        clearTimeout(timer);
        srvRes.writeHead(500);
        srvRes.end();
    });
}

vsm.on('exist', 'vs-default', function(vs) {
    vs.on('request', handleReq);
});

vsm.on('exist', 'vs-random', function(vs) {
    vs.on('request', function handleReq(srvReq, srvRes, cliReq) {
        var sleep = Math.floor(Math.random() * 2000) + 1;
        srvReq.bindHeaders(cliReq);
        srvReq.fastPipe(cliReq);
        cliReq.on('response', function(cliRes) {
            console.log('Sleeping ' + sleep + ' ms');
            setTimeout(function() {
                cliRes.bindHeaders(srvRes);
                cliRes.fastPipe(srvRes);
                cliRes.resume();
            }, sleep);
        });
    });
});
