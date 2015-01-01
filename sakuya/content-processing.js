var fs = require('fs'),
    pathutils = require('path');
var cache = require('./cache'),
    structures = require('./structures'),
    utils = require('./utils'),
    meta = require('./meta');


// @internal
// Retrieve mtime and contents of file at `path`
// Return { filename, mtime, contents } object.
function processFile(name, path, callback) {
    var fileobj = { filename: name };
    fs.stat(path, function(err, stats) {
        if (err) {
            return callback(err);
        }
        fileobj.mtime = stats.mtime;
        fs.readFile(path, function(err, buf) {
            if (err) {
                return callback(err);
            }
            cache.setRaw(name, buf.toString());
            callback(null, fileobj);
        });
    });
}

function stripMd(filename) {
    return filename.slice(0, -3);
}

// @internal
// Creates an index object from a list of files returned by `processFile`
function filesToIndex(callback) {
    function wrapped(err, files) {
        if (err) {
            callback(err);
        }
        var index = {
            articles: {},
            first: null,
            tags: []
        }, tags = structures.SSet();

        files = files.sort(function(a, b) {
            // latest first
            return b.mtime.getTime() - a.mtime.getTime();
        });
        var count = files.length;
        for (i = count - 1; i >= 0; i--) {
            var file = files[i],
                contents = cache.getRaw(file.filename),
                articleTags = meta.parseTags(contents),
                articleName = stripMd(file.filename);
            index.articles[articleName] = {
                file: file,
                next: (i != count - 1 ? stripMd(files[i + 1].filename) : null),
                prev: (i != 0 ? stripMd(files[i - 1].filename) : null),
                tags: articleTags,
                title: meta.parseTitle(contents)
            };
            tags.addAll(articleTags);
            if (i == 0) {
                index.first = articleName;
            }
        }
        index.tags = tags.toList();
        callback(null, index);
    }
    return wrapped;
}

// @internal
// From a directory list, retrieve all md files and process to
// generate an index object
function processContentList(path, callback) {
    function wrapped(err, files) {
        if (err) {
            return callback(err);
        }
        files = files.filter(function(filename) {
            return filename.substr(-3) == '.md';
        });
        var cb = utils.forEachCallback(files.length, filesToIndex(callback));
        files.forEach(function(filename) {
            var filepath = pathutils.join(path, filename);
            return processFile(filename, filepath, cb);
        });
    };
    return wrapped;
}

// Generate an index object with the files found in directory
// at `contentsPath` (default `../contents`)
function generateIndex(contentsPath, callback) {
    if (typeof contentsPath == 'function') {
        callback = contentsPath;
        contentsPath = null;
    }
    if (!contentsPath) {
        contentsPath = './contents';
    }
    fs.readdir(contentsPath, processContentList(contentsPath, callback));

}

module.exports.generateIndex = generateIndex;