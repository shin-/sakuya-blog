<!-- title: Asynchronous loops and list generation in node.js -->
<!-- tags: node.js, dev, code, javascript, underscore, async -->
# Asynchronous loops and list generation in node.js

If you've interacted with node.js any further than 3 lines of code on a weekend
before saying "Screw it, this isn't worth my sanity. I'm going back to
python/ruby/PHP", then you've probably already encountered this problem. Take
the following python code for example:

```python
import os
data = []
for file in os.listdir('.'):
    if os.path.isfile(file):
        f = open(file)
        data.append(f.read())
        f.close()

# process data list, for example sorting it then storing its contents in redis
```

Now in a synchronous paradigm, this is pretty straightforward to write. When
you want to do the same thing in node.js that has asynchronous file IO, this
becomes a bit more complex.

## Disclaimer

There are many ways to approach this problem, and the solutions I'll explore
in this article are certainly not the only ones. There are many control flow
libraries on npm and elsewhere that will help you do these things.
My approach here is a minimal one that uses no third-party libraries as an
exercise in leaner code and better understanding of the asynchronous paradigm.

If you're looking for ready-made solutions, look into 
[async](https://github.com/caolan/async), 
[fibers](https://github.com/laverdet/node-fibers) or
[async-foreach](https://www.npmjs.com/package/async-foreach).

## Naive solution

I'm calling this solution naive because it works only thanks to closures, and
as such is applicable only in simple situations where you can keep your code
inline.

```javascript
var fs = require('fs');
var data = [];
function callback(err, data) {
    // process data list
    console.log(err, data);
}

fs.readdir('.', function(err, dirlist) {
    // error handling omitted for concision
    var count = dirlist.length;
    function processFile(filename) {
        fs.stat(filename, function(err, stats) {
            if (!stats.isFile()) {
                if (--count == 0) {
                    callback(err, data);
                }
                return;
            }
            fs.readFile(filename, function(err, contents) {
                data.push(contents);
                if (--count == 0) {
                    callback(err, data);
                }
            });
        });
    }
    dirlist.forEach(processFile);
});
```
Ideally, I would want that `processFile` function to be outside the scope of
my `readdir`, so I can reuse this code elsewhere and reduce my nesting
level.

I could write this function:
```javascript

function processFiles(count, data, callback) {
    return function processFile(filename) {
        // same as before
    }
}
```

and change my `forEach` callback to be
```javascript
    dirlist.forEach(processFiles(dirlist.length, data, callback));
```

But this function is still very specifically handling my use-case of wanting
all the results in a list (while in another use case, I might want to process
the file contents as they are made available).
I still can't use `processFile` independently, and there's a lot of code
managing control flow in a function that just needs to read file contents.

Did we even solve anything at all? Let's move on to another solution that
can actually get rid of these flaws.

## Asynchronous `forEach` callback

We all have this toolbelt of functions that we often use and sometimes rewrite,
and this one is definitely part of mine.

```javascript
var _ = require('underscore');

function forEachCallback(length, callback) {
    var delayed = _.after(length, callback);
    delayed.res = [];
    return function(err, res) {
        if (err) {
            return callback(err);
        }
        delayed.res.push(res);
        delayed(err, delayed.res);
    }
}

```

Now this is a simple function wrapper that will take any standard callback
function and make it fit to use in an asynchronous forEach call. The first
argument is the number of elements present in the list (the `count` variable
we used before), the second is the function that will process the list of
results.

`forEachCallback` will store the data in an array everytime it is called, and
after `length` calls, will trigger the callback with the array of results. Or
if one of the calls results in an error, trigger the callback immediately with
that error.

We can rewrite our example:

```javascript
var forEachCallback = require('./utils').forEachCallback;

function processList(err, data) {
    // process data list
    console.log(err, data);
}

function processFile(filename, cb) {
    fs.stat(filename, function(err, stats) {
        if (!stats.isFile()) {
            return cb(err, null);
        }
        fs.readFile(filename, function(err, contents) {
            cb(err, contents);
        });
    });
}

fs.readdir('.', function(err, dirlist) {
    var callback = forEachCallback(dirlist.length, processList);
    dirlist.forEach(function(file) {
        processFile(file, callback);
    });
});

```

`processFile` is much simpler as a result, we minimized our use of closures,
but most importantly we've made `processFile` generic. So if we want to change
our code to process each file independently, we can do

```javascript

function processContents(err, data) {
    console.log(err, data);
}

fs.readdir('.', function(err, dirlist) {
    dirlist.forEach(function(file) {
        processFile(file, processContents);
    });
});
```

> You said you wouldn't use any third-party libraries but this code uses
> underscore.

This is true, and while underscore is a super-lightweight, extremely useful
toolbelt lib, you might have your reasons to want to opt out of using it.
The only underscore function we're using in this particular snippet is
`_.after` which we can easily rewrite.

```javascript
function after(count, fn) {
    return function() {
        if (--count < 1) {
            return fn.apply(null, arguments);
        }
    }
}

```

## Final words

It's important to be able to separate control-flow related code from the rest
in your node.js app. In my opinion, when people say "I can't keep track of 
anything in node.js, it's a callback-ridden nested mess.", it's usually because
they didn't make this separation properly &ndash; it's a common mistake
especially from people who are writing asynchronous code for the first time.
