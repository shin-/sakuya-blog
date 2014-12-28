cache = {
	articles: {},
	raws: {}
};

function getArticle(name) {
	return cache.articles[name];
}

function setArticle(name, content) {
	cache.articles[name] = content;
	return true;
}

function setRaw(name, content) {
	cache.raws[name] = content;
	return true;
}

function getRaw(name) {
	return cache.raws[name];
}

module.exports = {
	getArticle: getArticle,
	setArticle: setArticle,
	getRaw: getRaw,
	setRaw: setRaw
};