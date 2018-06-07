const winston = require('winston');
const request = require('request');
const _ = require('underscore');

module.exports = {
    compute: (texts, cb) => {
        const uri = 'http://' + (process.env.NLP_ADDRESS || 'nlp') + '/vocabulometer/lemmatize';

        if (!Array.isArray(texts)) {
            texts = [texts];
        }

        request({
            uri: uri,
            method: 'POST',
            json: {
                texts: texts
            }
        }, (error, response, body) => {
            if (error) {
                winston.log('info', 'Could not contact the NLP server at address ' + uri);
                winston.log('error', error);
                return cb(error);
            }

            if (response.statusCode === 404) {
                winston.log('error', 'Could not contact the NLP server at address ' + uri);

                return cb({
                    status: 500,
                    error: 'Could not contact the NLP server, thus text upload service is not available. Sorry'
                });
            }

            if (response.statusCode !== 200) {
                winston.log('error', 'NLP server responded with status code ' + response.statusCode);

                return cb('NLP server responded with status code ' + response.statusCode);
            }

            cb(null, body.texts.map(text => text.result.map((paragraph) => {
                return {
                    interWords: paragraph.interWords,
                    words: paragraph.words,
                    unrecognized: paragraph.unrecognized,
                    unrecognizedRate: paragraph.unrecognizedRate
                }
            })));
        });
    },

    wordify: (texts, cb) => {
        const uri = 'http://' + (process.env.NLP_ADDRESS || 'nlp') + '/vocabulometer/lemmatize';

        if (!Array.isArray(texts)) {
            texts = [texts];
        }

        request({
            uri: uri,
            method: 'POST',
            json: {
                texts: texts
            }
        }, (error, response, body) => {
            if (error) {
                winston.log('info', 'Could not contact the NLP server at address ' + uri);
                winston.log('error', error);
                return cb(error);
            }

            if (response.statusCode === 404) {
                winston.log('error', 'Could not contact the NLP server at address ' + uri);

                return cb({
                    status: 500,
                    error: 'Could not contact the NLP server, thus text upload service is not available. Sorry'
                });
            }

            if (response.statusCode !== 200) {
                winston.log('error', 'NLP server responded with status code ' + response.statusCode);

                return cb({
                    status: 500,
                    error: 'NLP server responded with status code ' + response.statusCode
                });
            }

            const textWords = body.texts.map((text) => _.uniq([]
                .concat(...text.result.map(p => p.words))
                .filter(w => w.lemma != null)
                .map(w => w.lemma)
            ));

            cb(null, textWords);
        });
    }
};