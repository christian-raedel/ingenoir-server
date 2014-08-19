var _ = require('lodash')
    , q = require('q')
    , restify = require('restify')
    , cstore = require('node-cstore');

function User() {
    var datastore = this.datastore
        , baseurl = this.config.getValue('baseurl').concat('/user');

    datastore.addModel(new cstore.CModel({name: '$User'}));

    function doSignin(user) {
        var defer = q.defer();

        if (user && user['_id']) {
            datastore.getModel('$User').updateAsync({'_id': user['_id']}, {
                lastLogin: new Date().getTime()
            })
            .then(function(updated) {
                defer.resolve(updated[0]);
            })
            .catch(function(err) {
                defer.reject(new restify.InternalError());
            });
        } else {
            defer.reject(new restify.InvalidCredentialsError());
        }

        return defer.promise;
    }

    this.post(baseurl.concat('/signup'), function(req, res, next) {
        var auth = req.authorization.basic;
        if (auth && auth.username && auth.password) {
            doSignin(datastore.getModel('$User').insert(auth))
            .then(function(user) {
                res.send(user);
            })
            .catch(next);
        } else {
            next(new restify.InvalidCredentialsError('Cannot signup user without given authorization info!'));
        }

        return next();
    });

    /*
    this.post(baseurl.concat('/signin'), function(req, res, next) {
        var auth = req.authorization.basic;
        if (auth && auth.username && auth.password) {
            datastore.getModel('$User').findOneAsync({username: auth.username, password: auth.password})
            .then(function(user) {
                doSignin(user).then(function(user) {
                    res.send(user);
                });
            })
            .catch(next);
        } else {
            next(new restify.InvalidCredentialsError('Cannot signin user without given authorization info!'));
        }

        return next();
    });
    */

    this.use(function(req, res, next) {
        var auth = req.authorization.basic;
        if (auth && auth.username && auth.password) {
            datastore.getModel('$User').findOneAsync({username: auth.username, password: auth.password})
            .then(function(user) {
                req.isAuthenticated = user && user.username === auth.username && user.password === auth.password;
                next();
            })
            .catch(next);
        }
    });

    this.get(baseurl.concat('/authenticated'), function(req, res, next) {
        res.send(req.isAuthenticated);
        next();
    });
}

module.exports.User = User;
