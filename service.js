'use strict';
//var azure = require('azure');
let https = require ('https');
var fs = require("fs");
var azure = require('azure');

let host = 'api.cognitive.microsoft.com';
let path = '/bing/v7.0/spellcheck';

var content = fs.readFileSync("cred.json");
var cred = JSON.parse(content);
/* NOTE: Replace this example key with a valid subscription key (see the Prequisites section above). Also note v5 and v7 require separate subscription keys. */
let key = cred.key1;

let serviceBusService = azure.createServiceBusService(cred.text2worker);

// These values are used for optional headers (see below).
// let CLIENT_ID = "<Client ID from Previous Response Goes Here>";
// let CLIENT_IP = "999.999.999.999";
// let CLIENT_LOCATION = "+90.0000000000000;long: 00.0000000000000;re:100.000000000000";

let mkt = "en-US";
let mode = "proof";
let text = "Hollo, wrld!";
let query_string = "?mkt=" + mkt + "&mode=" + mode;

let request_params = {
    method : 'POST',
    hostname : host,
    path : path + query_string,
    headers : {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length' : text.length + 5,
        'Ocp-Apim-Subscription-Key' : key,
//        'X-Search-Location' : CLIENT_LOCATION,
//        'X-MSEdge-ClientID' : CLIENT_ID,
//        'X-MSEdge-ClientIP' : CLIENT_ID,
    }
};

let response_handler = function (response) {
    let body = '';
    response.on ('data', function (d) {
        body += d;
    });
    response.on ('end', function () {
        console.log (body);
        // *TODO*
        // build answer
        // push answer into next queue
    });
    response.on ('error', function (e) {
        console.log ('Error: ' + e.message);
    });
};

let spellcheck_call = function(text) {
    let req = https.request (request_params, response_handler);
    req.write ("text=" + text);
    req.end ();
};

let receive = function() {
    serviceBusService.receiveQueueMessage('texttoworker', function(error, receivedMessage){
        if(!error){
            // Message received and deleted
            console.log("body: " + receivedMessage.body);
            spellcheck_call(receivedMessage.body);
        } else {
            console.log("error");
        }
        // *TODO* insert receive again
        receive();
    });
    /*
    serviceBusService.receiveQueueMessage('texttoworker', { isPeekLock: true }, function(error, lockedMessage){
        if(!error){
            // Message received and locked
            console.log("receive2");
            spellcheck_call(lockedMessage.body);
            
            serviceBusService.deleteMessage(lockedMessage, function (deleteError){
                if(!deleteError){
                    // Message deleted
                }
            });
        } else {
            console.log("error2");
        }
    });
    */
};

console.log("SpellcheckService...");

receive();
