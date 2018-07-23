const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const srslib = require("./srslib.js")
var cors = require('cors')
app.use(cors())
/*const libSportzones = require("./lib/sportzones/sportzones.js")
const libMiddlewares = require("./lib/middlewares/middlewares.js")
const libAdmins = require("./lib/admins/admins.js")*/

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId();

const MONGO_ADDRESS = "ds151820.mlab.com:51820/vocabulometer-dev"
const S0 = 1/3600,
			S1 = 1/3600 * 10,
			S2 = 1/3600 * 600,
			S3 = 12,
			S4 = 72,
			S5 = 102;

const SPACING = [S0, S1, S2, S3, S4, S5];


app.use(bodyParser.urlencoded( { extended: false}));
app.use(bodyParser.json())


app.get('/', function(req, res) {

    res.setHeader('Content-Type', 'text/plain');

    res.send('Vous êtes à l\'accueil, que puis-je pour vous ?');

});
app.get('/srs/getsize/:user_id', srslib.getSrsSize)

app.get('/srs/getallwords/:user_id', srslib.findAllSrsWords)

app.post('/srs/addword/:user_id', srslib.addWordToSrs)

app.delete('/srs/delword/:word_id', srslib.removeWordFromSrs)



app.get('/findwordidbyuserid/:user_id/:word', srslib.findWordIdByUserId)

app.get('/findwordsbylastseen/:user_id/:time', srslib.findWordsByLastSeen)

app.get('/findwordstolearn/:user_id', srslib.findWordsToLearn)

app.get('/findwordsbylevel/:user_id/', srslib.findWordsByLevel)
// :time -> req.query
//app.get('/findwordsbylastseen/:user_id/:time', srslib.findAllSrsWords, srslib.findWordsByLastSeen) //find all words that haven't be since since timeLastSeen



app.get('/readword/:word_id', srslib.readWord)

app.get('/translate/:word', srslib.translateWord)


app.post('/test/succeed/:word_id', srslib.succeedTest)

app.post('/test/fail/:word_id', srslib.failTest)

//app.get('/srs/addwords/:user_id', srslib.addWordsToSrs)




//routes ends here

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

// Functions declarations

const findAllSrsWords = (req,res) => { //return all words of a specific user
	return new Promise((resolve, reject) => {
	  Srs.aggregate( [
	    { $match: { userId: req.params.user_id } }], function (err, result) {
				if (err) return reject(err);
	      if (result.length){
					return resolve(result)
      	}
	    });
		})
	}

function findWordIdByUserId(word, user_id){ //return word_id with word and userid
    return new Promise((resolve, reject) => {
        var word_id = "";
        Srs.aggregate( [
            { $match: { userId: user_id  } },
            { $match: { word: word } } ], function (err, result) {
            if (err) return reject(err);
            if (result.length){
                //word_id = result[0]._id;
                //console.log("word _id: " + word_id);
                //return result[0]._id;
                return resolve(result[0]._id)
            }
        });
    })
}



function lvUp(id) {
  var newlv = 0;
  Srs.findOne({'_id': id},function(err,doc){ //mettre le findone and update dans le callback
    if(err) return console.error(err)
    else newlv = doc.lv + 1;
  })
  Srs.findOneAndUpdate({'_id': id},
    {$inc: {'lv': 1 }},
		function(err, doc){
      if (err) return console.error(err);
      else {
        console.log("Word level up: lv " + newlv);
      }
    });
}

function lvDown(id) {
  Srs.findOneAndUpdate({'_id': id},
    {$inc: {'lv': -1 }},
		function(err, doc){
      if (err) return console.error(err);
      else console.log("Word level down");
    });
}

function succeedTest(word_id) {
	var time = new Date()
  Srs.findOneAndUpdate({'_id': word_id},
    {$inc: {'testSuccess': 1 }},
    {$set:{'lastSeen': time}},
		function(err, doc){
      if (err) return console.error(err);
      else {
        if(doc.lv === 2 && doc.readNb >= 12 && doc.testSuccess >= 1) lvUp(doc._id);
        if(doc.lv === 3 && doc.readNb >= 18 && doc.testSuccess >= 2) lvUp(doc._id);
        if(doc.lv === 4 && doc.readNb >= 25 && doc.testSuccess >= 5) lvUp(doc._id);
				if(doc.lv === 5 && doc.testSuccess >= 6) removeWordFromSrs(doc._id)    // the word fit the condition to leave the srs
        console.log("test succeeded");
      }
    });
}

function failTest(id) {
  Srs.findOneAndUpdate({'_id': id},
    {$set: {'testSuccess': 0 }},
		function(err, doc){
      if (err) return console.error(err);
      else {
        if(doc.lv >= 3) lvDown(doc._id);
        console.log("test failed");
      }
    });
  }
function readWord(word_id) {
    var time = new Date();
    Srs.findOneAndUpdate({'_id': word_id},
        {
            $set: {'lastSeen': time},
            $inc: {'readNb': 1}
        },
        function (err, doc) {
            if (err) return console.error(err);
            else {
                if (doc.lv === 0) lvUp(doc._id);
                if (doc.lv === 1 && doc.readNb >= 5) lvUp(doc._id);
                //if(doc.lv === 2 && doc.readNb >= 12 && doc.testSuccess >= 1) lvUp(doc._id);
                //if(doc.lv === 3 && doc.readNb >= 18 && doc.testSuccess >= 2) lvUp(doc._id);
                //if(doc.lv === 4 && doc.readNb >= 25 && doc.testSuccess >= 5) lvUp(doc._id);
                console.log("Word read");
                console.log(time)
            }
        });
}
function timeDiff(dateold, datenew)
{
  var ynew = datenew.getFullYear();
  var mnew = datenew.getMonth();
  var dnew = datenew.getDate();
  var yold = dateold.getFullYear();
  var mold = dateold.getMonth();
  var dold = dateold.getDate();
  var diff = datenew - dateold;
  if(mold > mnew) diff--;
  else
  {
    if(mold == mnew)
    {
      if(dold > dnew) diff--;
    }
  }
  return diff;
}
       /////////////////////////////////////////////////
       app.listen(3000, console.log.call(console, 'Server started.'));

       // https://myaccount.google.com/lesssecureapps  @pour activer l'envoi des application moins securisées
