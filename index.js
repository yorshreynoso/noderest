/**
 * Primary file for the API
 * 
 */

// Node Dependencies
const http = require('http')
const https = require('https')
const StringDecoder = require('string_decoder').StringDecoder
const querystring = require('querystring');
var fs = require('fs')

// Local Dependencies
var config = require('./lib/config')
var handlers = require('./lib/handlers')
var helpers = require('./lib/helpers')

// protocols
const httpProtocol = 'http';
const httpsProtocol = 'https';

// ******************** HTTP Instance *************************
// Instantiating the HTTP server
var httpServer = http.createServer(function(req, res){
    unifiedServer(httpProtocol, req, res)
})

// Start the server
httpServer.listen(config.httpPort, function() {
    console.log("The serve is listening on port " + config.httpPort)
})
// ********************** END OF HTTP **************************


// ******************** HTTPS Instance *************************
// Instantiate the HTTPS server
var httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
}
var httpsServer = https.createServer(httpsServerOptions, function(req, res){
    unifiedServer(httpsProtocol, req, res)
})

// Start the HTTPS server
httpsServer.listen(config.httpsPort, function() {
    console.log("The serve is listening on port " + config.httpsPort)
})
// ********************** END OF HTTPS *****************************

// All the server logic for both the ttp and https server
var unifiedServer = function(protocol, req, res){

    // set the base url
    const baseURL = protocol + '://' + req.headers.host + '/'
    console.log("Headers")
    console.log(req.headers)

    // get the url
    const parseUrl = new URL(req.url,baseURL)

    // Get the path
    var path = parseUrl.pathname
    var trimmedPath = path.replace(/^\/+|\/+$/g, '')
    
    const query = querystring.parse(parseUrl.search)

    // get query string
    const oldQueryParams = JSON.parse(JSON.stringify(query))
    const queryStringObjectKeys = Object.keys(oldQueryParams);
    const queryParams = {}
    
    // loop through all the keys from the query string object
    queryStringObjectKeys.forEach((key, index) => {
        if(index == 0){
            newKey = key.replace("?", "")
            queryParams[newKey] = oldQueryParams[key]
        } else {
            queryParams[key] = oldQueryParams[key]
        }
    });

    // Get the HTTP Method
    var method = req.method.toLowerCase()   
    
    // Get the headers as an object
    var headers = req.headers

    // Get the payload, if any
    var decoder = new StringDecoder('utf-8')
    var buffer = ''

    req.on('data', function(data){
        buffer += decoder.write(data)
    })

    // this function gets called on every request
    req.on('end', function() {
        buffer += decoder.end()

        // Choose the handler this request should go to. If one is not found, use the notFound handler
        var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound
         
        // Construct the data object to send to the handler
        var data = { 
            'trimmedPath': trimmedPath,
            'queryParams': queryParams,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        }

        // Route the request to the handler specified in the router
        chosenHandler(data, function(statusCode, payload){
            // Use the status code called back by the handles, or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200

            // Use the payload called back by the handler or default to an empty Object
            payload = typeof(payload) == 'object' ? payload : {}

            // Convert the payload to a string
            var payloadString = JSON.stringify(payload)

            // return the response
            res.setHeader('Content-Type', 'application/json')
            res.writeHead(statusCode)
            res.end(payloadString)

            console.log("returning this response: ", statusCode, payloadString)
        })

        
    })

}


// Define  request router
var router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens
}