var fs = require('fs'),
    pathutils = require('path');
var md = require('markdown');
var structures = require('./structures'),
    utils = require('./utils');

// @sync
// Retrieve tag instructions in `contents` string and return
// a list of tags (duplicates are eliminated)
function parseTags(contents) {
    var re = /<!-- tags: ([^>]+)-->/g,
        tags = structures.SSet(),
        matchArray;

    while (matchArray = re.exec(contents)) {
        var t = matchArray[1].split(',').map(
            function(item) { return item.trim(); }
        );
        tags.addAll(t);
    }
    return tags.toList();
}

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
            // FIXME: that could amount to a lot of memory usage in the long run.
            fileobj.contents = buf.toString();
            callback(null, fileobj);
        });
    });
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
                article_tags = parseTags(file.contents),
                article_name = file.filename.slice(0, -3);
            index.articles[article_name] = {
                file: file,
                next: (i != count ? file[i + 1] : null),
                prev: (i != 0 ? file[i - 1] : null),
                tags: article_tags
            };
            tags.addAll(article_tags);
            if (i == 0) {
                index.first = article_name;
            }
        }
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

module.exports.parseTags = parseTags;
module.exports.generateIndex = generateIndex;