var express = require('express'),
    swig = require('swig');

var middlewares = require('./sakuya/middlewares'),
    content = require('./sakuya/content-processing');

var app = express();

app.use(express.static('staticfiles'));

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', './templates');

console.log('Processing content files...')
content.generateIndex(function(err, index) {
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
                    blogTitle: 'Sample blog',
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

    var server = app.listen(1990, function () {
        var host = server.address().address;
        var port = server.address().port;
        console.log('Sakuya listening at http://%s:%s', host, port);
    });

});
