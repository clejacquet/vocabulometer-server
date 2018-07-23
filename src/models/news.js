const winston = require('winston');
const request = require('request');
const async = require('async');
const _ = require('underscore');
const constants =  require('../constants');


const apiKey = constants.guardianApiKey;

module.exports = (mongoose, models) => {
    const newsSchema = new mongoose.Schema({
        srcId: {
            type: String,
            unique: true
        },
        title: String,
        section: String,
        text: String,
        date: Date
    });

    newsSchema.statics.get = function (cb) {
        this.find({}, cb);
    };

    newsSchema.statics.renew = function (cb) {
        this.remove({}, (err) => {
            if (err) {
                return cb(err);
            }

            async.parallel(Array(10).fill(0).map((dummy, i) => {
                return (cb1) => {
                    request({
                        url: 'https://content.guardianapis.com/search',
                        method: 'GET',
                        qs: {
                            'api-key': apiKey,
                            'show-fields': 'bodyText',
                            'page-size': 50,
                            'page': i + 1
                        }
                    }, (err, response, body) => {
                        if (err) {
                            return cb1(err);
                        }

                        if (!(response.statusCode >= 200 && response.statusCode < 300)) {
                            cb1(`Bad response code: ${response.statusCode}`);
                        }

                        const doc = JSON.parse(body);

                        const texts = doc.response.results.map(result => ({
                            srcId: result.id,
                            section: result.sectionId,
                            title: result.webTitle,
                            text: result.fields.bodyText,
                            date: new Date(result.webPublicationDate)
                        }));

                        cb1(undefined, texts);
                    });
                }
            }), (err, results) => {
                if (err) {
                    return cb(err);
                }

                const allTexts = _.flatten(results, 1);

                async.parallel(allTexts.map((text) => {
                    return (cb1) => {
                        this.create(text, (err) => cb1(undefined, err !== undefined));
                    }
                }), (err, status) => {
                    if (err) {
                        return cb(err);
                    }

                    cb(undefined, {
                        status: status
                    });
                });
            });
        });
    };

    return mongoose.model('news', newsSchema);
};