var _ = require('lodash');

function Echo() {
    var baseurl = this.config.getValue('baseurl').concat('/echo');

    this.get(baseurl.concat('/:message'), function(req, res, next) {
        if (req.authorization && _.isEqual(req.authorization.basic, {username: '$inge', password: '$noir'})) {
            res.send({message: req.params.message, authenticated: true});
        } else {
            res.send(req.params.message.split('').reverse().join(''));
        }
        return next();
    });
}

module.exports.Echo = Echo;
