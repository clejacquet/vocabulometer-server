const ModuleBase = require('../moduleBase');
module.exports = class extends ModuleBase {
    loadUri(uri, cb) {
        // Use Youtube API to retrieve the video transcript with the specified URI
        cb(undefined, 'youtube: ' + uri);
    }
};

