var fs = require('fs');
var yaml = require('js-yaml');

module.exports.loadConfig = function() {
    if (!this.config) {
        var config_file = process.env['SAKUYA_CFG'] || './config.yml';
        this.config = yaml.safeLoad(fs.readFileSync(config_file, 'utf8'));
    }
    return this.config;
}
