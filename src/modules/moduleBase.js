const async = require('async');

class BaseModule {
    constructor(name, language, models) {
        this.name = name;
        this.language = language;
        this._models = models;
    }

    get models() {
        return this._models;
    }

    save(urls, cb) {
        async.parallel(urls.map((uri) => {
            return (cb1) => this.loadUri(uri, (err, text) => {
                if (err) {
                    if (err.status >= 400 && err.status < 500) {
                        return cb1(undefined, err.error);
                    }
                    return cb1(err);
                }

                this._models.datasets[this.language][this.name].create(text, (err) => {
                    if (err) {
                        if (err.code === 11000) {
                            return cb1();
                        }

                        return cb1(err);
                    }

                    cb1(undefined, text);
                });
            });
        }), (err, texts) => {
            if (err) {
                return cb(err);
            }

            texts = texts.map((text, id) => ({ uri: urls[id], result: (text !== undefined) ? text : 'Already existing'}));

            if (texts.length === 0) {
                return cb(undefined, 'No uri saved');
            }

            cb(undefined, texts);
        })
    }
}

module.exports = BaseModule;