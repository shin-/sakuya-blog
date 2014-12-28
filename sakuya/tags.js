var structures = require('./structures');

function findArticlesForTag(index, tag) {
	return Object.keys(index.articles).filter(function(name) {
		return index.articles[name].tags.indexOf(tag) >= 0;
	});
}

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

module.exports = {
	findArticlesForTag: findArticlesForTag,
	parseTags: parseTags
}