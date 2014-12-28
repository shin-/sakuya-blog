// String set
function SSet() {
    if (!(this instanceof SSet)) {
        return new SSet();
    }
    this.__data = {};
    this.length = 0;
}

SSet.prototype.add = function(val) {
    if (this.__data[val]) {
        return;
    }
    this.length++;
    this.__data[val] = true;
    return this.length;
}

SSet.prototype.addAll = function(vals) {
    var self = this;
    vals.forEach(function(item) {
        self.add(item);
    });
    return this.length;
}

SSet.prototype.has = function(val) {
    return !!this.__data[val];
}

SSet.prototype.del = function(val) {
    if (!this.__data[val]) {
        return;
    }
    this.length--;
    delete this.__data[val];
    return this.length;
}

SSet.prototype.toList = function() {
    return Object.keys(this.__data);
}


module.exports.SSet = SSet;
