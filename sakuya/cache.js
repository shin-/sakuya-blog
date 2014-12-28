cache = {
	articles: {}
};

function getArticle(name) {
	return cache.articles[name];
}

function setArticle(name, content) {
	cache.articles[name] = content;
	return true;
}

module.exports = {
	getArticle: getArticle,
	setArticle: setArticle
};