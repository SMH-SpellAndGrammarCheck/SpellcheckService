'use strict';
//var azure = require('azure');
let https = require('https');
var fs = require("fs");
var azure = require('azure');

let host = 'api.cognitive.microsoft.com';
let path = '/bing/v7.0/spellcheck';

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

let response_handler = function (response) {
    let body = '';
    response.on('data', function (d) {
        body += d;
    });
    response.on('end', function () {
        let json = JSON.parse(body);
        console.log("original text: " + text);
        //console.log("response: " + body);
        //console.log(json.flaggedTokens);

        // build answer
        let flaggedTokens = json.flaggedTokens; //JSON.parse(json.flaggedTokens);
        console.log("ft: " + flaggedTokens);

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
        let sentenceString = 'In the original sentence:\n' +
        text + '\n the following tokens have been found:\n' + findings + '\n\n';
        customProperties['findings'] = findings > 0;
        send(sentence,  customProperties);
    });
    response.on('error', function (e) {
        console.log('Error: ' + e.message);
    });
};

let spellcheck_call = function (originalText) {
    text = ""
    text = originalText;
    console.log("size: " + text.length);
    let req = https.request(request_params(), response_handler);
    req.write("text=" + text);
    //console.log(req);
    req.end();
};

let receive = function () {
    serviceBusService.receiveQueueMessage(cred.receiveQueue, function (error, receivedMessage) {
        if (!error) {
            // Message received and deleted
            //console.log("headers2: " + receivedMessage.customProperties);
            customProperties = receivedMessage.customProperties;
            spellcheck_call(receivedMessage.body);
        } else {
            console.log("error");
        }
        // *TODO* insert receive again
        receive();
    });
};

let send = function (text, findings, metaData) {
    let message = {
        body: text,
        customProperties: metaData
    };

    serviceBusService.sendQueueMessage(cred.sendQueue, JSON.stringify(message), function (error) {
        if (!error) {
            // message sent
            console.log('[Log] Sending message ' + message.customProperties.chunknr);
            console.log('[Log] content ' + JSON.stringify(message.body));
        }
    });
}

console.log("SpellcheckService...");

receive();
