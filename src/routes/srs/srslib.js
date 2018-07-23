const translate = require('google-translate-api');


// Time spacing for srs repetition
const S0 = 1/3600,
      S1 = 1/3600 * 10,
      S2 = 1/3600 * 600,
      S3 = 12,
      S4 = 72,
      S5 = 102;

const SPACING = [S0, S1, S2, S3, S4, S5];
const SRS_MAX_SIZE = 50;


module.exports = {
    getSrsSize: (req, res) => {
        var srsSize = 0;
        req.models.srs.aggregate( [
            { $match: { userId: req.params.user_id  } },
            { $group: { _id: null, count: { $sum: 1 }}}], function (err, result) {
            if (err) return console.log(err);
            if (!result.length) console.log("user does not exists")
            else { console.log("heyyy");
                res.json(result[0].count)}
        })
    },

    findWordIdByUserId: (req, res) => { //return word_id with word and userid
        console.log("enter")
        req.models.srs.aggregate( [
            { $match: { userId: req.params.user_id  } },
            { $match: { word: req.params.word } } ], function (err, result) {
            if (err) console.log(err);
            if (result.length){
                console.log("res enter")
                console.log(result)
                //word_id = result[0]._id;
                //console.log("word _id: " + word_id);
                //return result[0]._id;
                res.json(result[0]._id)
            }
            if(!result.length) {
                console.log("couldn't find word")
                res.json("No such word exists")
            }
        });
    },


    //middleware
    findAllSrsWords: (req,res, next) => { //return all words of a specific user
        req.models.srs.aggregate( [
            { $match: { userId: req.params.user_id } }], function (err, result) {
            if (err) console.log(err);
            if (!result.length) console.log("user does not exists")
            if (result.length){
                if(req.params.time){ next() }
                res.json(result);
            }
        })
    },

    findWordsByLastSeen: (req, res) => { //find all words that haven't be since since timeLastSeen
        var currentDate = new Date();
        var idList = [];
        var time = req.params.time;
        console.log(time)
        req.models.srs.findAllSrsWords(req.params.user_id)
            .then( result => {
                if(result.length){
                    console.log("hey")
                    for(let i = 0; i < result.length; i++){
                        if(req.models.srs.timeDiff(result[i].lastSeen, currentDate) > time*3600*1000){
                            //console.log(timeDiff(res[i].lastSeen, currentDate));
                            idList.push(result[i])
                            console.log(result[i])
                            //console.log(res[i].word)
                        }
                    }
                    if(!idList.length) console.log("No remaining words last seen");
                    res.json(idList);
                }
                if(!result.length) res.send("No words last seen")
            })
    },

    findWordsToLearn: (req, res) => {
        var learningArray = [ [], [], [], [], [], [] ];

        for(let i = 0; i < 6; i++){
            req.models.srs.findWordsByLastSeen(req.params.user_id, SPACING[i])
                .then( result => {
                    console.log("in then")
                    for(let j = 0; j < result.length; j++){
                        if(result[j].lv === i) {
                            learningArray[i].push(result[j]);
                        }
                    }
                    if(i === 5) res.json(learningArray);
                })
        }
        if(!learningArray.length) {
            console.log("No remaining words to learn");
            res.json("No remaining words to learn")
        }
    },

    removeWordFromSrs: (req, res) => {
        req.models.srs.findOneAndRemove({ _id: req.params.word_id }, function(err, doc){
            if(err) console.log("the word you are removing doesn't exists")
            if(doc) {
                console.log("Word removed");
                res.json({
                    success: true
                });
            }
            else { console.log("Word you want to remove doesn't exists") }
        })
    },

    readWord: (req, res) => {
        var time = new Date()/*.toISOString()*/;
        req.models.srs.findOneAndUpdate({'_id': req.params.word_id},
            {
                $set:{'lastSeen': time},
                $inc: {'readNb': 1 }
            },
            function(err, doc){
                console.log(doc);
                if (err) return console.error(err);
                if (doc === null) { console.log("Word does not fuckin exists") }
                else {
                    if(doc.lv === 0) lvUp(doc._id);
                    if(doc.lv === 1 && doc.readNb >= 5) lvUp(doc._id);
                    //if(doc.lv === 2 && doc.readNb >= 12 && doc.testSuccess >= 1) lvUp(doc._id);
                    //if(doc.lv === 3 && doc.readNb >= 18 && doc.testSuccess >= 2) lvUp(doc._id);
                    //if(doc.lv === 4 && doc.readNb >= 25 && doc.testSuccess >= 5) lvUp(doc._id);
                    console.log("Word read");

                    res.json(doc);
                }
            });
    },

    translateWord: (req, res) => {
        translate(req.params.word, {to: 'en'}).then(result => {
            console.log(result.text);
            res.json(result.text)

        }).catch(err => {
            console.error(err);
        });

    },

    succeedTest: (req, res) => {
        var time = new Date()
        req.models.srs.findOneAndUpdate({'_id': req.params.word_id},
            {$inc: {'testSuccess': 1 }},
            {$set:{'lastSeen': time}},
            function(err, doc){
                if (err) return console.error(err);
                else {
                    if(doc.lv === 2 && doc.readNb >= 12 && doc.testSuccess >= 1) req.models.srs.lvUp(doc._id);
                    if(doc.lv === 3 && doc.readNb >= 18 && doc.testSuccess >= 2) req.models.srs.lvUp(doc._id);
                    if(doc.lv === 4 && doc.readNb >= 25 && doc.testSuccess >= 5) req.models.srs.lvUp(doc._id);
                    if(doc.lv === 5 && doc.testSuccess >= 6) req.models.srs.removeWordFromSrs(doc._id)    // the word fit the condition to leave the req.models.srs
                    console.log("test succeeded");
                    res.json({
                        success: true
                    });
                }
            });
    },

    failTest: (req, res) => {
        req.models.srs.findOneAndUpdate({'_id': req.params.word_id},
            {$set: {'testSuccess': 0 }},
            function(err, doc){
                if (err) return console.error(err);
                else {
                    if(doc.lv >= 3) req.models.srs.lvDown(doc._id);
                    console.log("test failed");

                    res.json({
                        success: true
                    });
                }
            });
    },

    /*addWordsToSrs: (req, res) => { // wordlist : req.query -->  ?w1=...&w2=...&...
        return new Promise((resolve, reject) => {
        console.log(req.query)
        var wordList = req.query;
          for(i in req.query){
          console.log(wordList)
                if(getSrsSize(req.params.user_id) === SRS_MAX_SIZE){
                    console.log("SRS_MAX_SIZE reached");
                    // Do something
                    // break;
                }
            Srs.findOne({word: req.query[i], userId: req.params.user_id}, function (err, result){
              if (err) return reject(err);
              if (result === null){        //check that the word isn't already in the srs
                console.log("word isn't in the srs... it will be added soon");
              var currentWord = new Srs({word: req.query[i], userId: req.params.user_id});
                currentWord.save(function (err, srs) {
                  if (err) return console.error(err);
                            else {

                  console.log("done")
                  return resolve("success adding words in the srs")
                }
              })
            }
              if (result !== null) console.log("Error adding word... it is already in the srs");
            })

          }
        })
    }*/

    addWordToSrs: (req, res) => {
        req.models.srs.findOne({word: req.query.word, userId: req.params.user_id}, function (err, result){
            if (err) return reject(err);
            if (result === null){        //check that the word isn't already in the srs
                //console.log("word isn't in the srs... it will be added soon");
                var currentWord = new req.models.srs({word: req.query.word, userId: req.params.user_id});
                currentWord.save(function (err, doc) {
                    if (err) return console.error(err);
                    else {
                        console.log("word added to srs");
                        return res.json({
                            msg: `success adding words in the srs: ${doc.word}`
                        });
                    }
                })
            }
            if (result !== null) console.log("Error adding word... it is already in the srs");
        })
    },

    findWordsByLevel: (req, res) => {
        const user_id = req.params.user_id.toString();
        const level = parseInt(req.query.level, 10);
        req.models.srs.aggregate([
            {
                $match: {
                    $and:
                        [{userId: user_id},
                            {lv: level}]
                }
            }
            ],
            function (err, result) {
                if (err) return reject(err);
                if (result !== null) {
                    console.log(result)
                    return res.json(result);
                }
                if (result.length)
                    console.log("No words level " + req.query.level + " found for this user")
            });
    }
};
