const express = require('express');
const request = require('request');

const router = express.Router({
    caseSensitive: false,
    mergeParams: false,
    strict: false
});
const check = require('../policies/check');

module.exports = (passport) => {
    //  Sends the ID of a random text
    //
    // 	GET /api/texts/sample
    // 	input-type: None
    // 	output-type: JSON
    //
    //	output-structure: {
    //		sample: String
    //  }
    router.get('/wanikani',
        check.schema({
            userApiKey: {
                in: 'query',
                errorMessage: 'language parameter provided is incorrect',
                exists: true
            }
        }),
        (req, res, next) => {
            const userApiKey = req.data.userApiKey;

            request({
                url: `https://www.wanikani.com/api/user/${userApiKey}/vocabulary`,
                method: 'GET'
            }, (err, response, body) => {
                if (err) {
                    return next(err);
                }

                const doc = JSON.parse(body);

                const words = doc.requested_information.general
                    .filter(entry => entry.user_specific.srs_numeric >= 7)
                    .map(entry => entry.character);

                res.json({
                    count: words.length,
                    words: words
                });
            });
        });

    return router;
};