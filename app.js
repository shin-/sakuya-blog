var express = require('express'),
    swig = require('swig');

var middlewares = require('./sakuya/middlewares'),
    content = require('./sakuya/content-processing'),
    meta = require('./sakuya/meta');

var app = express();

app.use(express.static('staticfiles'));

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', './templates');

console.log('Loading configuration file... ')
var config = require('./sakuya/config').loadConfig();

console.log('Processing content files...')
content.generateIndex(config.contents, function(err, index) {
    if (err) {
        return console.error('Error generating index:', err);
    }
    console.log(
        'Index generated, ' + Object.keys(index.articles).length + 
        ' articles found.'
    )
    for (articleName in index.articles) {
        app.get('/' + articleName,
            middlewares.registerArticleName(articleName),
            middlewares.renderMarkdown(index),
            middlewares.viewCommons(config, index),
            function(req, res) {
                var article = index.articles[req.articleName];
                res.render('layout.html', req.commons({
                    prev: article.prev,
                    next: article.next,
                    articleContents: function() { return req.articleHTML; }
                }));
            }
        );
    }
    app.get('/', function(req, res) {
        res.redirect('/' + index.first);
    });

    app.get('/tags/:tag', middlewares.viewCommons(config, index), function(req, res) {
        var articles = meta.findArticlesForTag(index, req.params.tag)
        res.render('tags.html', req.commons({
            articles: articles,
            tag: req.params.tag
        }));
    });

    app.get('/tags/', middlewares.viewCommons(config, index), function(req, res) {
        res.render('tags.html', req.commons({
            articles: index.tags
        }));
    });

    var server = app.listen(1990, function () {
        var host = server.address().address;
        var port = server.address().port;
        console.log('Sakuya listening at http://%s:%s', host, port);
    });

});
