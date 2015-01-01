var fs = require('fs');
var yaml = require('js-yaml');

module.exports.loadConfig = function(config_file) {
    if (!config_file) {
        config_file = './config.yml'
    }
    return yaml.safeLoad(fs.readFileSync(config_file, 'utf8'));
}
