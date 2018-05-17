const async = require('async');

class BaseModule {
    constructor(name, models) {
        this.name = name;
        this._models = models;
    }

    get models() {
        return this._models;
    }

    save(urls, cb) {
        async.parallel(urls.map((uri) => {
            return (cb1) => this.loadUri(uri, (err, text) => {
                if (err) {
                    return cb1(err);
                }

                this._models.datasets[this.name].create(text, (err) => {
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

            texts = texts.filter(text => text !== undefined);

            cb(undefined, texts);
        })
    }
}

module.exports = BaseModule;