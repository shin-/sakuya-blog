var express = require('express'),
    swig = require('swig');

var middlewares = require('./sakuya/middlewares'),
    content = require('./sakuya/content-processing'),
    tags = require('./sakuya/tags');

var app = express();

app.use(express.static('staticfiles'));

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', './templates');

console.log('Loading configuration file... ')
var config = require('./sakuya/config').loadConfig(process.env['SAKUYA_CFG']);

console.log('Processing content files...')
content.generateIndex(config.contents, function(err, index) {
    if (err) {
        return console.error(err);
    }
    console.log(
        'Index generated, ' + Object.keys(index.articles).length + 
        ' articles found.'
    )
    for (articleName in index.articles) {
        app.get('/' + articleName,
            middlewares.registerArticleName(articleName),
            middlewares.renderMarkdown(index),
            function(req, res) {
                var article = index.articles[req.articleName];
                res.render('layout.html', {
                    blogTitle: config.title,
                    prev: article.prev,
                    next: article.next,
                    tags: article.tags,
                    articleContents: function() { return req.articleHTML; }
                });
            }
        );
    }
    app.get('/', function(req, res) {
        res.redirect('/' + index.first);
    });

    app.get('/tags/:tag', function(req, res) {
        var articles = tags.findArticlesForTag(index, req.params.tag)
        res.render('tags.html', {
            blogTitle: config.title,
            articles: articles,
            tag: req.params.tag
        })
    });

    app.get('/tags/', function(req, res) {
        res.render('tags.html', {
            blogTitle: config.title,
            articles: index.tags
        })
    })

    var server = app.listen(1990, function () {
        var host = server.address().address;
        var port = server.address().port;
        console.log('Sakuya listening at http://%s:%s', host, port);
    });

});
