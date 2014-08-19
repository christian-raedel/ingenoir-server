var _ = require('lodash')
    , expect = require('chai').expect
    , q = require('q')
    , restify = require('restify')
    , clogger = require('node-clogger')
    , RestServer = require('../lib/rest-server');

var logger = new clogger.CLogger('tests');

describe('RestServer', function() {
    it('should instanciates', function() {
        expect(new RestServer()).to.be.an.instanceof(RestServer);
    });

    it('should startup and shutdown', function(done) {
        var server = new RestServer();
        server.startup().then(function(server) {
            server.shutdown().then(function(server) {
                expect(server).to.be.an.instanceof(RestServer);
                done();
            }).catch(function(reason) {
                done(new Error(reason));
            });
        });
    });
});

describe('RestServer:Plugins', function() {
    it('should load rest-api', function(done) {
        var server = new RestServer();
        server.startup().then(function(server) {
            server.loadApi();

            var client = restify.createJsonClient({url: 'http://localhost:3000'});
            client.get('/api/v2/echo/dlc', function(err, req, res, obj) {
                expect(obj).to.be.equal('cld');
                server.shutdown();
                done();
            });
        }).catch(function(reason) {
            server.shutdown(function(server) {
                done(new Error(reason));
            });
        });
    });

    it('should load authorizationParser plugin', function(done) {
        var server = new RestServer();
        server.startup().then(function(server) {
            server.use(restify.authorizationParser());
            server.loadApi();

            var client = restify.createJsonClient({url: 'http://localhost:3000'});
            client.basicAuth('$inge', '$noir');
            client.get('/api/v2/echo/dlc', function(err, req, res, obj) {
                expect(obj).to.be.deep.equal({message: 'dlc', authenticated: true});
                server.shutdown();
                done();
            });
        }).catch(function(reason) {
            server.shutdown(function(server) {
                done(new Error(reason));
            });
        });
    });
});

describe('RestServer:User', function() {
    var server = null, client = null;

    before(function(done) {
        server = new RestServer();
        server.startup().then(function(server) {
            server.use(restify.authorizationParser());
            server.loadApi();
            done();
        })
        .catch(function(err) {
            server.shutdown();
            done(err);
        });

        client = restify.createJsonClient({url: 'http://localhost:3000'});
        client.basicAuth('$inge', '$noir');
    });

    after(function(done) {
        client.close();
        server.shutdown().then(function() {
            done();
        });
    });

    it('should signup a user', function(done) {
        client.post('/api/v2/user/signup', function(err, req, res, user) {
            logger.debug('signed up user: [%j]', user);
            expect(user['_id']).to.be.ok;
            expect(user.username).to.be.equal('$inge');
            expect(user.password).to.be.equal('$noir');
            expect(user.lastLogin).to.be.above(0);
            done();
        });
    });

    it('should set isAuthenticated flag', function(done) {
        client.get('/api/v2/user/authenticated', function(err, req, res, isAuthenticated) {
            logger.debug('isAuthenticated: [%j]', isAuthenticated);
            expect(isAuthenticated).to.be.true;
            done();
        });
    });

    /*
    it('should signin a user', function(done) {
        var client = restify.createJsonClient({url: 'http://localhost:3000'});
        client.basicAuth('$inge', '$noir');
        client.post('/api/v2/user/signin', function(err, req, res, user) {
            expect(user['_id']).to.be.ok;
            expect(user.username).to.be.equal('$inge');
            expect(user.password).to.be.equal('$noir');
            expect(user.session).to.be.ok;
            expect(user.lastLogin).to.be.above(0);
            done();
        });
    });
    */
});
