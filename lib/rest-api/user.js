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
                defer.reject(new restify.InternalError(err));
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
                return next();
            })
            .catch(function(err) {
                return next(err);
            });
        } else {
            return next(new restify.InvalidCredentialsError('Cannot signup user without given authorization info!'));
        }
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

    this.use(function isAuthenticated(req, res, next) {
        var auth = req.authorization.basic;
        if (auth && auth.username && auth.password) {
            datastore.getModel('$User').findOneAsync({username: auth.username, password: auth.password})
            .then(function(user) {
                req.authorization.user = user;
                return next();
            })
            .catch(function(err) {
                return next(err);
            });
        } else {
            return next();
        }
    });

    this.get(baseurl.concat('/authenticated'), function(req, res, next) {
        res.send(req.authorization);
        return next();
    });

    this.post(baseurl.concat('/update'), function(req, res, next) {
        if (req.authorization.user) {
            var user = req.body.user;
            if (user && user.username && user.password && user['_id']) {
                datastore.getModel('$User').updateAsync({'_id': user['_id']}, user)
                .then(function(updated) {
                    res.send(updated[0]);
                    return next();
                })
                .catch(function(err) {
                    return next(err);
                });
            } else {
                return next(new restify.InvalidCredentialsError('Expect a username and a password!'));
            }
        } else {
            return next(new restify.NotAuthorizedError());
        }
    });
}

module.exports.User = User;
