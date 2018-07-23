const ModuleBase = require('../../moduleBase');
const async = require('async');

module.exports = class extends ModuleBase {
    loadUri(uri, cb) {
        if (!super.models.youtube.active) {
            return cb({
                status: 503,
                error: 'Youtube service unavailable. An admin has to activate it'
            });
        }

        async.seq(
            (uri, cb1) => super.models.youtube.content(uri, cb1),
            (info, cb1) => {
                super.models.nlp.wordify(info.text, (err, textWords) => {
                    if (err) {
                        return cb1(err);
                    }

                    if (textWords.length < 1) {
                        return cb1('Words are missing from NLP results');
                    }

                    cb1(undefined, {
                        words: textWords[0],
                        title: info.title
                    });
                });
            }
        )(uri, (err, info) => {
            if (err) {
                return cb(err);
            }

            cb(undefined, {
                uri: uri,
                title: info.title,
                words: info.words
            });
        });
    }
};

