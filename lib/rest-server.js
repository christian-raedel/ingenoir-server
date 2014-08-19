var _ = require('lodash')
    , util = require('util')
    , fs = require('fs')
    , path = require('path')
    , restify = require('restify')
    , Server = require('restify/lib/server')
    , Router = require('restify/lib/router')
    , q = require('q')
    , clogger = require('../../node-clogger')
    , CConf = require('node-cconf').CConf
    , cstore = require('node-cstore');

function RestServer(opts) {
    opts = opts || {};

    var name = opts.name || 'rest-server';

    var config = new CConf(name, ['port', 'baseurl', 'plugins'])
        .setDefault('port', 3000)
        .setDefault('baseurl', '/api/v2')
        .setDefault('plugins', path.resolve(__dirname, 'rest-api'))
        .load(opts);

    var logger = new clogger.CLogger(name, {
        transports: [
            new clogger.transports.Console()
        ]
    });

    var logfilename = config.getValue('logfilename');
    if (_.isString(logfilename)) {
        logger.addTransport(new clogger.transports.LogFile({
            'filename': logfilename
        }));
    }

    var datastore = new cstore.CStore({
        name: name,
        filename: config.getValue('database')
    });

    opts.certificate = config.getValue('https:cert');
    opts.key = config.getValue('https:key');
    opts.log = logger;
    opts.router = new Router(opts);
    Server.apply(this, [opts]);


    logger.extend(this);
    this.name = name;
    this.config = config;
    this.datastore = datastore;
}

util.inherits(RestServer, Server);

RestServer.prototype.startup = function() {
    var config = this.config
        , self = this
        , port = config.getValue('port')
        , defer = q.defer();

    this.listen(port, function() {
        self.info('listen at [%d]', port);
        defer.resolve(self);
    }).on('error', function(err) {
        defer.reject(err.message);
    });

    return defer.promise;
};

RestServer.prototype.shutdown = function(timeout) {
    var self = this
        , defer = q.defer();

    this.on('close', function() {
        defer.resolve(self);
    });
    this.close();

    q.timeout(defer, timeout || 2000, 'Shutdown-time expired!');

    return defer.promise;
};

RestServer.prototype.loadApi = function() {
    var pluginsdir = path.resolve(process.cwd, this.config.getValue('plugins'));

    _.forEach(fs.readdirSync(pluginsdir), function(filename) {
        if (fs.statSync(pluginsdir.concat('/', filename)).isFile() && filename.match(/.*\.js$/)) {
            var name = filename.split('-').map(function(value) {
                return value && value[0].toUpperCase() + value.slice(1);
            }).join('').replace(/\.js$/, '');

            var module = require(path.resolve(pluginsdir, filename));
            if (_.isFunction(module[name])) {
                module[name].apply(this);
            } else {
                this.error('Cannot load plugin "%s"', name);
            }
        }
    }, this);

    return this;
};

module.exports = RestServer;
