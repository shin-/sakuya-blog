var express = require('express');

var middlewares = require('./sakuya/middlewares'),
    content = require('./sakuya/content-processing');

var app = express();

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
        var article = index.articles[articleName];
        app.get('/' + articleName, 
            middlewares.render_markdown(index), 
            function(req, res) {
                res.setHeader('Content-Type', 'text/html');
                // FIXME: Previous, next, header, footer, tags...
                res.end(req.articleHTML);
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
