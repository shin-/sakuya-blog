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
            throw 'Redis cache not yet implemented. Please use mem instead.';
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

module.exports = new Module();