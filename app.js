/**
 * Created by rishabhdev on 18/12/16.
 */
var http = require('http');
var express = require('express')
var app = express();
var mongodb = require('mongodb');
var bodyParser = require('body-parser');
var async = require('async');
var moment = require('moment');
var MongoClient = mongodb.MongoClient;
var url = 'mongodb://localhost:27017/bookobooks';
var jwt = require('jwt-simple');
app.set('jwtTokenSecret', 'bookobooks_secret_key');


var dbInstance ;
MongoClient.connect(url, function (err, db) {
    if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {

        dbInstance = db;
    }
});

app.listen(80);

app.use(bodyParser.json())

app.post('/signup',function(req,res){
    var userData = req.body;
    console.log(userData);
    var collection = dbInstance.collection('users');

    async.waterfall([function(callback){
        collection.findOne({email:userData.email},function(err,data){
            if(data){
                callback('userExists');
            }
            else{
                callback(null);
            }
        })
    },
    function(callback){
        if(userData.email && userData.password && userData.firstname){
            collection.insert({email:userData.email,password: userData.password,fn:userData.firstname,ln:userData.lastname},function(err,data){
                if(!err){
                    callback(null);
                }
            })
        }
    }],function(err){

        if(!err) {
            res.json({'status': 'success',token:getToken(userData.email)});
        }else{
            res.json({'status':'fail'});
        }
    })

});

app.post('/login',function(req,res){
    var userData = req.body;
    var collection = dbInstance.collection('users');
    collection.findOne({email:userData.email},function(err,data){
        if(data.password === userData.password){
            res.json({status:'success',token:getToken(userData.email)});
        }
        else{
            res.json({status:'fail'});
        }
    })
});

app.get('/profile',isLogged,function(req,res){
    if(req.user){
        res.json({'status':'success','user':req.user.email});
    }
    else{
        res.json({'status':'fail'});

    }
});
function getToken(email){
    var expires = moment().add('days', 7).valueOf();

    return jwt.encode({"email": email, "exp": expires},app.get('jwtTokenSecret'));
}
function isLogged(req,res,next){

    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
    console.log(token);
    if (token) {
        try {
            var decoded = jwt.decode(token, app.get('jwtTokenSecret'));
            console.log(decoded);
            if (decoded.exp <= Date.now()) {
                res.end('Access token has expired', 400);
            }
            var collection = dbInstance.collection('users');

            collection.findOne({ email: decoded.email }, function(err, user) {
                req.user = user;
                next();
            });

        } catch (err) {
            return next();
        }
    } else {
        next();
    }
}
