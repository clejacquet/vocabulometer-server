const async = require('async');

module.exports = class {
    constructor(name) {
        this.name = name;
    }

    save(urls, cb) {
        async.map(urls, this.loadUri, (err, texts) => {
            if (err) {
                return cb(err);
            }

            cb(undefined, texts);
        })
    }
};