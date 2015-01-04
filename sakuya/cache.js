function Module() {
    if (!(this instanceof Module)) {
        return new Module();
    }
    var cfg = require('./config').loadConfig();
    switch (cfg.cache.type) {
        case 'mem':
            this.backend = MemoryBackend();
            break;
        case 'redis':
            this.backend = RedisBackend(cfg.cache);
            break;
        default:
            console.warn('Unknown cache type, defaulting to mem');
            this.backend = MemoryBackend();
    }
}

Module.prototype.getArticle = function(name, cb) {
    this.backend.get('articles', name, cb);
}

Module.prototype.setArticle = function(name, content, cb) {
    this.backend.set('articles', name, content, cb)
}

Module.prototype.setRaw = function(name, content, cb) {
    this.backend.set('raws', name, content, cb)
}

Module.prototype.getRaw = function(name, cb) {
    this.backend.get('raws', name, cb)
}

function MemoryBackend() {
    if (!(this instanceof MemoryBackend)) {
        return new MemoryBackend();
    }
    this._cache = {
        articles: {},
        raws: {}
    };
}

MemoryBackend.prototype.get = function(cat, name, cb) {
    if (!this._cache[cat]) {
        return cb('Invalid cache category "' + cat + '"');
    }
    cb(null, this._cache[cat][name]);
}

MemoryBackend.prototype.set = function(cat, name, value, cb) {
    if (!this._cache[cat]) {
        return cb && cb('Invalid cache category "' + cat + '"');
    }
    this._cache[cat][name] = value;
    cb && cb(null, true);
}

function RedisBackend(cfg) {
    if (!(this instanceof RedisBackend)) {
        return new RedisBackend(cfg);
    }
    this._redis = require('redis').createClient(
        cfg.port || 6379,
        cfg.host || 'localhost',
        { 'auth_pass': cfg.pass }
    );

    this._redis.on('error', function(err) {
        console.warn(
            'Redis has encountered a connection error "' + err + '"',
            ', it should reconnect automatically.'
        );
    });

    this._redis.select(cfg.db || 0, (function() {
        if (cfg.flush) {
            console.log('Flushing redis db #' + (cfg.db || 0));
            this._redis.flushdb();
        }
    }).bind(this));
}

RedisBackend.prototype.key = function(cat, name) {
    return 'sakuya:cache:' + cat + ':' + name;
}

RedisBackend.prototype.get = function(cat, name, cb) {
    this._redis.get(this.key(cat, name), cb);
};

RedisBackend.prototype.set = function(cat, name, value, cb) {
    this._redis.set(this.key(cat, name), value, cb);
}

module.exports = new Module();