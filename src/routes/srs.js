const express = require('express');
const check = require('../policies/check');

const router = express.Router({
    caseSensitive: false,
    mergeParams: false,
    strict: false
});

const srslib = require('./srs/srslib');


module.exports = (passport) => {
    router.get('/srs/getsize/:user_id',
        passport.isLoggedIn,
        check.schema({
            user_id: {
                in: 'params',
                exists: true,
                errorMessage: 'No user Id parameter provided',
            }
        }),
        srslib.getSrsSize);

    router.get('/srs/getallwords/:user_id',
        passport.isLoggedIn,
        check.schema({
            user_id: {
                in: 'params',
                exists: true,
                errorMessage: 'No user Id parameter provided',
            }
        }),
        srslib.findAllSrsWords);

    router.post('/srs/addword/:user_id',
        passport.isLoggedIn,
        check.schema({
            user_id: {
                in: 'params',
                exists: true,
                errorMessage: 'No user Id parameter provided',
            },
            word: {
                in: 'query',
                exists: true,
                errorMessage: 'No word parameter provided',
            }
        }),
        srslib.addWordToSrs);

    router.delete('/srs/delword/:word_id',
        passport.isLoggedIn,
        check.schema({
            word_id: {
                in: 'params',
                exists: true,
                errorMessage: 'No word id parameter provided',
            }
        }),
        srslib.removeWordFromSrs);



    router.get('/findwordidbyuserid/:user_id/:word',
        passport.isLoggedIn,
        check.schema({
            user_id: {
                in: 'params',
                exists: true,
                errorMessage: 'No user Id parameter provided',
            },
            word: {
                in: 'params',
                exists: true,
                errorMessage: 'No word parameter provided',
            }
        }),
        srslib.findWordIdByUserId);

    router.get('/findwordsbylastseen/:user_id/:time',
        passport.isLoggedIn,
        check.schema({
            user_id: {
                in: 'params',
                exists: true,
                errorMessage: 'No user Id parameter provided',
            },
            time: {
                in: 'params',
                errorMessage: 'No time parameter provided',
                isInt: true,
                custom: { options: (value) => parseInt(value) >= 0 },
                sanitizer: value => parseInt(value)
            }
        }),
        srslib.findWordsByLastSeen);

    router.get('/findwordstolearn/:user_id',
        passport.isLoggedIn,
        check.schema({
            user_id: {
                in: 'params',
                exists: true,
                errorMessage: 'No user Id parameter provided',
            }
        }),
        srslib.findWordsToLearn);

    router.get('/findwordsbylevel/:user_id/',
        passport.isLoggedIn,
        check.schema({
            user_id: {
                in: 'params',
                exists: true,
                errorMessage: 'No user Id parameter provided',
            },
            level: {
                in: 'query',
                errorMessage: 'No level parameter provided',
                isInt: true,
                custom: { options: (value) => parseInt(value) >= 0 },
                sanitizer: value => parseInt(value)
            }
        }),
        srslib.findWordsByLevel);
// :time -> req.query
//router.get('/findwordsbylastseen/:user_id/:time', srslib.findAllSrsWords, srslib.findWordsByLastSeen) //find all words that haven't be since since timeLastSeen



    router.post('/readword/:word_id',
        passport.isLoggedIn,
        check.schema({
            word_id: {
                in: 'params',
                exists: true,
                errorMessage: 'No word id parameter provided',
            }
        }),
        srslib.readWord);

    router.get('/translate/:word',
        passport.isLoggedIn,
        check.schema({
            word: {
                in: 'params',
                exists: true,
                errorMessage: 'No word parameter provided',
            }
        }),
        srslib.translateWord);


    router.post('/test/succeed/:word_id',
        passport.isLoggedIn,
        check.schema({
            word_id: {
                in: 'params',
                exists: true,
                errorMessage: 'No word id parameter provided',
            }
        }),
        srslib.succeedTest);

    router.post('/test/fail/:word_id',
        passport.isLoggedIn,
        check.schema({
            word_id: {
                in: 'params',
                exists: true,
                errorMessage: 'No word id parameter provided',
            }
        }),
        srslib.failTest);
    
    return router;
};