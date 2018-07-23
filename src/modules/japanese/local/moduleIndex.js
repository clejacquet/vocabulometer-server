const ModuleBase = require('../../moduleBase');

module.exports = class extends ModuleBase {
    loadUri(uri, cb) {
        super.models.texts.japanese.findOne({ _id: uri }, ['text.title', 'text.words'], (err, doc) => {
            if (err) {
                return cb(err);
            }

            cb(undefined, {
                uri: uri,
                title: doc.text.title,
                words: doc.text.words
            });
        });
    }
};

