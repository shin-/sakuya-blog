var md = require('marked');
var cache = require('./cache');

function registerArticleName(name) {
    function wrapped(req, res, next) {
        req.articleName = name;
        next()
    }
    return wrapped;
}

function renderMarkdown(index) {
    function wrapped(req, res, next) {
        var u = req.originalUrl;
        if (u.substr(-1) == '/')
            u = u.slice(0, -1);
        var articleName = req.articleName,
            articleHTML = cache.getArticle(articleName);
        if (articleHTML) {
            req.articleHTML = articleHTML;
            return next();
        }
        articleHTML = md(cache.getRaw(articleName + '.md'));
        cache.setArticle(articleName, articleHTML);
        req.articleHTML = articleHTML;
        return next();
    }
    return wrapped;
}

module.exports.renderMarkdown = renderMarkdown;
module.exports.registerArticleName = registerArticleName;