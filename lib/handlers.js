/**
 * Request handlers
 */

// Dependencies
const _data = require('./data')
const helpers = require('./helpers')

// Define the handlers
const handlers = {}

// Not found handler
handlers.notFound = function(data, callback) {
    callback(404)
}

handlers.ping = function(data, callback) {
    
    callback(200)
}

// Users
handlers.users = function(data, callback) {

    var acceptableMethods = ['post', 'get', 'put', 'delete']
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data, callback)
    } else {
        callback(405)
    }

}

// Container for users sub methods
handlers._users = {}

// Users post
// Required data: firstname, lastname, phone, password, tosAgreement
handlers._users.post = function(data, callback) {

    // Check that all required fields are filled out
    var firstname = typeof(data.payload.firstname) == 'string' && data.payload.firstname.trim().length > 0 ? data.payload.firstname.trim() : false
    var lastname = typeof(data.payload.lastname) == 'string' && data.payload.lastname.trim().length > 0 ? data.payload.lastname.trim() : false
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false

    if(firstname && lastname && phone && password && tosAgreement) {
        // Make sure that the user does not already exist
        _data.read('users', phone, function(err, data){
            if(err){

                // Hash the password
                const hashedPassword = helpers.hash(password)

                // Create the user object
                if(hashedPassword){
                    const userObject = {
                        'firstname': firstname,
                        'lastname': lastname,
                        'phone': phone,
                        'tosAgreement': true,
                        'hashedPassword': hashedPassword

                    }

                    // Store the user
                    _data.create('users', phone, userObject, function(err){
                        if(!err){
                            callback(200)
                        } else {
                            console.log(err)
                            callback(500, {'error': 'Could not create the new user'})
                        }
                    })
                } else {
                    callback(500, {'Error': 'Could not hash the users\'s password'})
                }

            } else {
                // User already exists
                callback(400, {'Error': 'A user with that phopne number already exists'})
            }
        })

    } else {
        callback(400, {'Error': 'Missing required fields'})
    }

}

// Users get
// Required data: phone
// Optional data: none
// @TODO Only let an authenticated user access their object. Don't let them access anyone else's
handlers._users.get = function(data, callback) {
    // check that the phonenumber provided is valid
    var phone = typeof(data.queryParams.phone) == 'string' && data.queryParams.phone.trim().length == 10 ? data.queryParams.phone.trim() : false
    if(phone) {
        _data.read('users', phone, function(err, data){
            if(!err && data) {

                // remove the hashed password from the user object before returning it to the requester
                delete data.hashedPassword
                callback(200, data)
            } else {
                callback(404)
            }
        })
    } else {
        callback(400, {'Error': 'Missing required fields'})
    }
    
}

// Users put
// Required data: phone
// Optional data: firstname, lastname, password (at least one must be specified)
// @TODO Only let the authenticated user update their own objects
handlers._users.put = function(data, callback) {
    // Check for the required field
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    
    // Check for the optional fields
    var firstname = typeof(data.payload.firstname) == 'string' && data.payload.firstname.trim().length > 0 ? data.payload.firstname.trim() : false
    var lastname = typeof(data.payload.lastname) == 'string' && data.payload.lastname.trim().length > 0 ? data.payload.lastname.trim() : false
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

    // Error if the phone is invalid
    if(phone) {
        if(firstname || lastname || password){
            // Lookup the user
            _data.read('users', phone, function(err, userData){
                if(!err && userData) {
                    // Update the fields necessary
                    if(firstname){
                        userData.firstname = firstname
                    }
                    if(lastname){
                        userData.lastname = lastname
                    }
                    if(password){
                        userData.hashedPassword = helpers.hash(password)
                    }
                } else {
                    callback(400, {"Error": "The specified user does not exist"})
                }
                // Store the new updates
                _data.update('users', phone, userData, function(err){
                    if(!err){
                        callback(200)
                    } else {
                        callback(500, {"Error": "Could not update the user"})
                    }
                })
            })
        } else {
            callback(400, {"Error": "Missing fields to update"})
        }
    } else {
        callback(400, {"Error": "Missing required field"})
    }
  
}

// Users delete
// Required field: phone
// @TODO Only let the authenticated user update their own objects
// @TODO Delete any other data files associated with this user
handlers._users.delete = function(data, callback) {
    // Check that the phone number is valid
    var phone = typeof(data.queryParams.phone) == 'string' && data.queryParams.phone.trim().length == 10 ? data.queryParams.phone.trim() : false
    if(phone) {
        _data.read('users', phone, function(err, data){
            if(!err && data) {
                _data.delete("users", phone, function(err){
                    if(!err){
                        callback(200, data)
                    } else {
                        callback(500, {"Error": "Could not delete the specified user"})

                    }
                })
            } else {
                callback(404, {"error": "Could not find the specified user"})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required fields'})
    }
        
    
}



// Container for tokens sub methods
handlers._tokens = {}

// Tokens
handlers.tokens = function(data, callback) {

    var acceptableMethods = ['post', 'get', 'put', 'delete']
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method](data, callback)
    } else {
        callback(405)
    }
}

handlers._tokens.post = function(data, callback) {

    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

    if(phone && password) {
        // Lookup the user who matches that phone number
        _data.read('users', phone, function(err, userData){
            if(!err && userData){
                // Hash the sent password, and compare it to the password stored in the user Object
                let hashedPassword = helpers.hash(password)
                if(hashedPassword == userData.hashedPassword) {
                    // create new token with random name. Set expiration date 1 hour in the future
                    let tokenID = helpers.createRandomString(20)
                    let expires = Date.now() + 1000 * 60 * 60
                    let tokenObject = {
                        'phone': phone,
                        'id' : tokenID,
                        'expires' : expires
                    }

                    // Store the token
                    _data.create("tokens", tokenID, tokenObject, function(err){
                        if(!err){
                            callback(200, tokenObject)
                        } else {
                            callback(500, {"Error" : "Could not create the new token"})
                        }
                    })
                } else {
                    callback(400, {"Error" : "Password did not match the specified user\'s stored password"})
                }
            } else {
                callback(400, {"Error" : "Could not find the specified user"})
            }
        })
    } else {
        callback(400, {"Error" : "Missing required field(s)"})
    }
}

// Toekns - get
// required data: id
// Optional data: none
handlers._tokens.get = function(data, callback){
    // check that the phonenumber provided is valid
    var id = typeof(data.queryParams.id) == 'string' && data.queryParams.id.trim().length == 20 ? data.queryParams.id.trim() : false
    if(id) {
        _data.read('tokens', id, function(err, tokenData){
            if(!err && tokenData) {

                callback(200, tokenData)
            } else {
                callback(404)
            }
        })
    } else {
        callback(400, {'Error': 'Missing required fields'})
    }
}

// Toekns - put
// required data: id, extend
// Optional data: none
handlers._tokens.put = function(data, callback){ 
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false
    if(id && extend) {
        // Lookup the token
        _data.read('tokens', id, function(err, tokenData){
            if(!err && tokenData){
                // Check to make sure the token isn't already expired
                if(tokenData.expires > Date.now()){
                    // Set the expiration an hour from now
                    tokenData.expires = Date.now() * 1000 * 60 * 60

                    _data.update('tokens', id, tokenData, function(err){
                        if(!err) {
                            callback(200)
                        } else{
                            callback(500, {"Error": "Could not updte the token expiration"})
                        }
                    })

                } else {
                    callback(400, {"Error": "Token expired and cannot be extended"})
                }
            } else {
                // 404 specified token does not exit
                callback(400, {"Error": "specified token does not exit"})
            }
        })
    } else {
        callback(400, {"Error": "Missing required fields or field(s) are invalid"})
    }



}

// tokens- delete
// Required data: id
// optional data: none
handlers._tokens.delete = function(data, callback) {
    // Check that the phone number is valid
    var id = typeof(data.queryParams.id) == 'string' && data.queryParams.id.trim().length == 20 ? data.queryParams.id.trim() : false

    // Lookup the token
    if(id) {
        _data.read('tokens', id, function(err, data){
            if(!err && data) {
                _data.delete("tokens", id, function(err){
                    if(!err){
                        callback(200)
                    } else {
                        callback(500, {"Error": "Could not delete the specified token"})
                    }
                })
            } else {
                callback(400, {"error": "Could not find the specified token"})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required fields'})
    }
        
    
}

module.exports = handlers