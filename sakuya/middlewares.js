var md = require('marked');
var cache = require('./cache');

function render_markdown(index) {
    function wrapped(req, res, next) {
        var u = req.originalUrl;
        if (u.substr(-1) == '/')
            u = u.slice(0, -1);
        var articleName = u.substr(u.lastIndexOf('/') + 1),
            articleHTML = cache.getArticle(articleName);
        if (articleHTML) {
            req.articleHTML = articleHTML;
            return next();
        }
        articleHTML = md(index.articles[articleName].file.contents);
        cache.setArticle(articleName, articleHTML);
        req.articleHTML = articleHTML;
        return next();
    }
    return wrapped;
}

module.exports.render_markdown = render_markdown;