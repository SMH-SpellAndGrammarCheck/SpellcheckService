/**
 * Worker to receive messages from queue, send them to spell check api and send the response
 * to next queue for aggregation.
 * ------------------
 * @author SMH - Sandro Speth, Matthias Hermann, Heiko Geppert
 * @version 1.0.0
 */
'use strict';
const https = require('https');
const fs = require("fs");
const azure = require('azure');

const host = 'api.cognitive.microsoft.com';
const path = '/bing/v7.0/spellcheck';

/*
// for local execution
var content = fs.readFileSync("cred.json");
var cred = JSON.parse(content);
// NOTE: Replace this example key with a valid subscription key (see the Prequisites section above). Also note v5 and v7 require separate subscription keys. 
let 
let cred = {
        "key":cred.key1;
        "receiveQueue":"texttoworker",
        "sendQueue":"workertoaggregator"
    }

*/

let text = "";
let customProperties;

// These values are used for optional headers (see below).
// let CLIENT_ID = "<Client ID from Previous Response Goes Here>";
// let CLIENT_IP = "999.999.999.999";
// let CLIENT_LOCATION = "+90.0000000000000;long: 00.0000000000000;re:100.000000000000";

let mkt = "en-US";
let mode = "proof";
let query_string = "?mkt=" + mkt + "&mode=" + mode;

var cred = {};
if (process.env.RECEIVE_QUEUE === undefined || process.env.SEND_QUEUE === undefined) {
    var content = fs.readFileSync("cred.json");
    var cont = JSON.parse(content);
    cred = {
        key:cont.key1,
        queue:cont.queue,
        receiveQueue:"texttoworker",
        sendQueue:"workertoaggregator"
    };

} else {
    cred = {
        key: process.env.BING_KEY,
        queue:process.env.QUEUE,
        receiveQueue: process.env.RECEIVE_QUEUE,
        sendQueue: process.env.SEND_QUEUE
    };
}

const serviceBusService = azure.createServiceBusService(cred.queue);

/**
 * Creating service bus queues if they not already exists
 */
serviceBusService.createQueueIfNotExists(cred.receiveQueue, function (error) {
    if (!error) {
        // Queue exists
        console.log('[Log] Receive queue exists!');
    }
});

serviceBusService.createQueueIfNotExists(cred.sendQueue, function (error) {
    if (!error) {
        // Queue exists
        console.log('[Log] Send queue exists!');
    }
});


/**
 * Request parameter for post request to Spell Check API
 */
let request_params = function () {
    return {
        method: 'POST',
        hostname: host,
        path: path + query_string,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': text.length + 5,
            'Ocp-Apim-Subscription-Key': key,
            //        'X-Search-Location' : CLIENT_LOCATION,
            //        'X-MSEdge-ClientID' : CLIENT_ID,
            //        'X-MSEdge-ClientIP' : CLIENT_ID,
        }
    };
};

/**
 * Response handler of POST request to Spell Check API
 * @param {*} response 
 */
let response_handler = function (response) {
    let body = '';
    // Concatenate data
    response.on('data', function (d) {
        body += d;
    });
    // If end of response has received, parse body and process
    response.on('end', function () {
        let json = JSON.parse(body);
        console.log("[Log] original text: " + text);
        //console.log("response: " + body);
        //console.log(json.flaggedTokens);

        // build answer
        let flaggedTokens = json.flaggedTokens; //JSON.parse(json.flaggedTokens);
        console.log("[Log] flagged tokens: " + flaggedTokens);

        let findings = [];

        flaggedTokens.forEach(element => {
            console.log(element.suggestions[0]);
            var correction = element.suggestions[0].suggestion;

            // push answer into next queue
            /*
            console.log("relevant values:");
            console.log(text);
            console.log(element.token);
            console.log(correction);
            console.log(customProperties);
            console.log("================");
            */
        });
        
        findings.push([element.token, correction]);
        let sentenceString = 'In the original sentence:\n\"' +
        text + '\"\n the following tokens have been found:\n\"' + findings + '\"\n\n';
        customProperties['findings'] = findings > 0;
        send(sentence,  customProperties);
    });
    response.on('error', function (e) {
        console.log('[Error] ' + e.message);
    });
};

/**
 * Call POST request to spell check api
 * @param {*} originalText 
 */
let spellcheck_call = function (originalText) {
    text = ""
    text = originalText;
    console.log("[Log] text size: " + text.length);
    let req = https.request(request_params(), response_handler);
    req.write("text=" + text);
    //console.log(req);
    req.end();
};

/**
 * Recursive function to receive messages.
 */
let receive = function () {
    serviceBusService.receiveQueueMessage(cred.receiveQueue, function (error, receivedMessage) {
        if (!error) {
            // Message received and deleted
            //console.log("headers2: " + receivedMessage.customProperties);
            customProperties = receivedMessage.customProperties;
            spellcheck_call(receivedMessage.body);
        } else {
            console.log("[Log] Error receiving message: " + error);
        }
        receive();
    });
};

/**
 * Send message to queue for aggregation
 * @param {*} text text with original and findingd
 * @param {*} findings boolean if there are findings to filter in aggregator
 * @param {*} metaData customProperties for message
 */
let send = function (text, findings, metaData) {
    let message = {
        body: text,
        customProperties: metaData
    };

    serviceBusService.sendQueueMessage(cred.sendQueue, message, function (error) {
        if (!error) {
            // message sent
            console.log('[Log] Sending message ' + message.customProperties.chunknr);
            console.log('[Log] content ' + JSON.stringify(message.body));
        }
    });
}

receive();
