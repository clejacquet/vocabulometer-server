const ModuleBase = require('../../moduleBase');

module.exports = class extends ModuleBase {
    loadUri(uri, cb) {
        cb({
            error: 'Not implemented',
            status: 501
        })
    }
};

