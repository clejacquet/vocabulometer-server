const express = require('express');

const router = express.Router({
    caseSensitive: false,
    mergeParams: false,
    strict: false
});

const srslib = require('./srs/srslib');


module.exports = (passport) => {
    router.get('/', function(req, res) {

        res.setHeader('Content-Type', 'text/plain');

        res.send('Vous êtes à l\'accueil, que puis-je pour vous ?');

    });
    router.get('/srs/getsize/:user_id', srslib.getSrsSize)

    router.get('/srs/getallwords/:user_id', srslib.findAllSrsWords)

    router.post('/srs/addword/:user_id', srslib.addWordToSrs)

    router.delete('/srs/delword/:word_id', srslib.removeWordFromSrs)



    router.get('/findwordidbyuserid/:user_id/:word', srslib.findWordIdByUserId)

    router.get('/findwordsbylastseen/:user_id/:time', srslib.findWordsByLastSeen)

    router.get('/findwordstolearn/:user_id', srslib.findWordsToLearn)

    router.get('/findwordsbylevel/:user_id/', srslib.findWordsByLevel)
// :time -> req.query
//router.get('/findwordsbylastseen/:user_id/:time', srslib.findAllSrsWords, srslib.findWordsByLastSeen) //find all words that haven't be since since timeLastSeen



    router.post('/readword/:word_id', srslib.readWord)

    router.get('/translate/:word', srslib.translateWord)


    router.post('/test/succeed/:word_id', srslib.succeedTest)

    router.post('/test/fail/:word_id', srslib.failTest)
    
    return router;
}