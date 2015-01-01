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

function viewCommons(cfg, index) {
    function wrapped(req, res, next) {
        var data = {
            blogTitle: cfg.title,
            hltheme: cfg['highlight-theme']
        };
        if (req.articleName) {
            var art = index.articles[req.articleName];
            data.tags = art.tags;
            data.pageTitle = art.title;
            data.meta = art.meta;
        }
        req.commons = function(obj) {
            for (k in data) {
                obj[k] = data[k];
            }
            return obj;
        }
        return next();
    }
    return wrapped;
}

module.exports = {
    renderMarkdown: renderMarkdown,
    registerArticleName: registerArticleName,
    viewCommons: viewCommons
};
