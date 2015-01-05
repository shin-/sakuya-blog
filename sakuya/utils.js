var _ = require('underscore');

// Callback will be called either
// * if an error is encountered during one of the calls
// * after `length` successful iterations
// if successful second argument will be a list of all the results
function forEachCallback(length, callback) {
    var delayed = _.after(length, callback);
    delayed.res = [];
    return function(err, res) {
        if (err) {
            return callback(err);
        }
        delayed.res.push(res);
        delayed(err, delayed.res);
    }
}

module.exports.forEachCallback = forEachCallback;