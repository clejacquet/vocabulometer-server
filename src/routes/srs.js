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
    // return the number of words in a user's SRS
    router.get('/srs/getsize/:user_id', srslib.getSrsSize)
    // return all the words in a user's SRS
    router.get('/srs/getallwords/:user_id', srslib.findAllSrsWords)
    // add a word in an user's SRS
    router.post('/srs/addword/:user_id', srslib.addWordToSrs)
    // delete a word from the SRS of an user
    router.delete('/srs/delword/:word_id', srslib.removeWordFromSrs)


    // return the id of a word given word and user_id
    router.get('/findwordidbyuserid/:user_id/:word', srslib.findWordIdByUserId)
    // return every word that heven't been seen since <time>
    router.get('/findwordsbylastseen/:user_id/:time', srslib.findWordsByLastSeen)
    // return the words that the user has to learn given the time last seen matching the specified spacing
    router.get('/findwordstolearn/:user_id', srslib.findWordsToLearn)
    // return words of an user's SRS with the specified level
    router.get('/findwordsbylevel/:user_id/', srslib.findWordsByLevel)
    // :time -> req.query
    //app.get('/findwordsbylastseen/:user_id/:time', srslib.findAllSrsWords, srslib.findWordsByLastSeen) //find all words that haven't be since since timeLastSeen


    // read the specified word (updates "readNb" and "last seen" fields (and also "lv" in some cases))
    router.get('/readword/:word_id', srslib.readWord)
    // translate a word from the "src" language to english
    router.get('/translate/:word', srslib.translateWord)
    // find synonyms of the word given in parameter
    router.get('/synonym/:word', srslib.findSynonym)
    // find definition of the word given in parameter
    router.get('/definition/:word', srslib.findDefinition)


    // succeed the test for a word (updates "testSuccess" and possibly "lv")
    router.post('/test/succeed/:word_id', srslib.succeedTest)
    // fail the test for a word (updates "testSuccess" and possibly "lv")
    router.post('/test/fail/:word_id', srslib.failTest)

    return router;
}
