//var fetch = require('fetch');
var fetch = require('node-fetch');
var fs = require('fs')
var readline = require('readline');
var mongoose = require('mongoose');
//var ObjectId = mongoose.ObjectId;
var ObjectId = mongoose.Types.ObjectId();

// import of libraries
var Word_local = require('./Word');
//var srslib = require('./srslib');




// DATABASE CONNECTION
const MONGO_ADDRESS = "ds151820.mlab.com:51820/vocabulometer-dev"
const SRS_MAX_SIZE = 50;      //max length of the srsList
const USER_ID = "999";
const S0 = 1/3600,
			S1 = 1/3600 * 10,
			S2 = 1/3600 * 600,
			S3 = 12,
			S4 = 72,
			S5 = 102;

const SPACING = [S0, S1, S2, S3, S4, S5];


mongoose.connect("mongodb://" + MONGO_ADDRESS, {user: 'clejacquet', pass: 'clejacquet-imp'});
var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error"));
db.once("open", function(callback) {
	console.log("Connected to the database...");
});



// Declaration of the word collection
var SrsSchema = mongoose.Schema;
var SrsSchema = new SrsSchema({
	word: { type: String, required: true},
	readNb: { type: Number, required: true, default: 0 },
	lv: { type: Number, required: true, default: 0 },
	testSuccess: { type: Number, default: 0},
	lastSeen : { type: Date, default: 0},
  userId : { type: String, default: USER_ID}
});
//restriction : unique couple word <-> userId

var Srs = mongoose.model("srs", SrsSchema);
//declaration of the SRS List and every wordlist
var srsList = [],
    wordList1 = [],
    wordList2 = [],
    wordList3 = [],
    wordList4 = [],
    wordList5 = [],
    wordList6 = [],
    wordList7 = [],
    wordList8 = [],
    wordList9 = [],
    wordList10 = [];

var wordList = ["bite", "triceratops", "couillemolle"];





 //
//promise.then( res => {console.log(res)}, fail => {console.log("promise failed")});
/*var id = findWordIdByUserId("a", "111") //return word_id with word and userid
console.log(id);
var srrs = findAllSrsWords("abc");
var lv1 = findWordsByLevel("111", 1);
var size = getSrsSize("abc")*/
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

function getSrsSize(user_id) { //count the number of words in an user's SRS
  	return new Promise((resolve, reject) => {
  	  var srsSize = 0;
  	  Srs.aggregate( [
  	    { $match: { userId: user_id  } },
  	    { $group: { _id: null, count: { $sum: 1 }}}], function (err, result) {
  				if (err) return reject(err);
  	      if (result.length){
  	        srsSize = result[0].count;
  	        return resolve(srsSize);
  	      }
  	    });
  	  })
  	}



  //return id;
function findAllSrsWords(user_id){ //return all words of a specific user
	return new Promise((resolve, reject) => {
	  Srs.aggregate( [
	    { $match: { userId: user_id  } }], function (err, result) {
				if (err) return reject(err);
	      if (result.length){
					return resolve(result)
      	}
	    });
		})
	}
//findAllSrsWords("111")


function removeWordFromSrs(word_id){
	return new Promise((resolve, reject) => {
		Srs.findOneAndRemove({ _id: word_id }, function(err, res){
			if(err) reject("the word you are removing doesn't exists")
			else {
				console.log("Word removed");
				resolve("Word removed");
			}
		})
	})
}





function addWordsToSrs(user_id, wordList){ // take a wordlist and an user_id as input and add it to the user's srs
	return new Promise((resolve, reject) => {
	  for(let i = 0; i < wordList.length; i++){
			if(getSrsSize(user_id) === SRS_MAX_SIZE){
				console.log("SRS_MAX_SIZE reached");
				// Do something
				// break;
			}
	    Srs.findOne({word: wordList[i], userId: user_id}, function (err, result){
	      if (err) return reject(err);
	      if (result === null){        //check that the word isn't already in the srs
	        console.log("word isn't in the srs... it will be added soon");
	        var currentWord = new Srs({word: wordList[i], userId: user_id});
	        currentWord.save(function (err, srs) {
	          if (err) return console.error(err);
						else {return resolve("success adding words in the srs")}
	      })
	    }
	      if (result !== null) console.log("Error adding word... it is already in the srs");
	    })
	  }
	})
}



//addWordsToSrs("abc", ["test1", "test2", "test3"]);

function findWordsByLevel(user_id, level){
	return new Promise((resolve, reject) => {
	  Srs.aggregate( [
	    { $match: {$and: [{ userId: user_id}, { lv: level } ] } }], function (err, result) {
	    	if (err) return reject(err);
	      if (result.length){
	        return resolve(result)
	      }
	      if (!result.length)
					return resolve("No words level " + level + " found for this user")
	    });
	})
}
//findWordsByLevel("111", 2)

function findWordsByLastSeen(user_id, timeLastSeenHours){ //find all words that haven't be since since timeLastSeen
	return new Promise((resolve, reject) => {
		var currentDate = new Date();
		var idList = [];
		findAllSrsWords(user_id)
		.then( res => {
			if(res.length){
				for(let i = 0; i < res.length; i++){
					if(timeDiff(res[i].lastSeen, currentDate) > timeLastSeenHours*3600*1000){
						//console.log(timeDiff(res[i].lastSeen, currentDate));
						idList.push(res[i])
						//console.log(res[i].word)
					}
				}
				if(!idList.length) console.log("No remaining words last seen");
				return resolve(idList);
			}
		},
		fail => console.log("promise failed"));
	})
}



//////////////////////////////////////
//Find words to learn based on the time last seen
//There is a time spacing for each word level
//If the time last seen matches the time spacing, the word is pushed in the learning Array
//////////////////////////////////////

function findWordsToLearn(user_id){
	return new Promise((resolve, reject) => {
		var learningArray = [ [], [], [], [], [], [] ];
		for(let i = 0; i < 6; i++){
			findWordsByLastSeen(user_id, SPACING[i])
			.then( res => {
				//console.log("========= " + i + " ==========")
				//console.log(res)
				for(let j = 0; j < res.length; j++){
					if(res[j].lv === i) {
						learningArray[i].push(res[j]);
					}
				}
				if(i === 5) resolve(learningArray);
			},
			fail => reject("promise failure"))
		}
		if(!learningArray.length) console.log("No remaining words to learn");
	})
}



function readWord(word_id) {
	var time = new Date()/*.toISOString()*/;
  Srs.findOneAndUpdate({'_id': word_id},
		{
			$set:{'lastSeen': time},
			$inc: {'readNb': 1 }
		},
		function(err, doc){
      if (err) return console.error(err);
      else {
        if(doc.lv === 0) lvUp(doc._id);
        if(doc.lv === 1 && doc.readNb >= 5) lvUp(doc._id);
        //if(doc.lv === 2 && doc.readNb >= 12 && doc.testSuccess >= 1) lvUp(doc._id);
        //if(doc.lv === 3 && doc.readNb >= 18 && doc.testSuccess >= 2) lvUp(doc._id);
        //if(doc.lv === 4 && doc.readNb >= 25 && doc.testSuccess >= 5) lvUp(doc._id);
        console.log("Word read");
				console.log(time)
      }
    });
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

/*const date1 = new Date()
setTimeout(function(){
    const date2 = new Date();
		console.log(timeDiff(date1, date2))
}, 2000);*/






console.log(" ================== wordList ================= ");
console.log(wordList1);
console.log(wordList1.length);
//wordList1[0].enterSrs();
//srslib.addNextWords(52, wordList1, srsList, srsMaxSize);
console.log(srsList);
console.log("SRS List length: " + srsList.length)




//readWord("5b35e140fd68c817bd175065");
//lvUp("5b346c81a2fdef70e53abed8");
//lvDown("5b346c81a2fdef70e53abed8");
//succeedTest("5b346c81a2fdef70e53abed8");
//failTest("5b346c81a2fdef70e53abed8");
//
//getSrsSize("111");


console.log("===== Async function tests start here =====");

//readWord("5b35ce891492db0ee8b23459");

console.log();
//readWord("5b35e140fd68c817bd175064")
findWordsByLastSeen("111", 1)
.then(res =>{
	var idList = res;
	console.log(res)
	//console.log(res)
	//console.log(res)
	//console.log(res)
})


findWordIdByUserId("able", "111")
.then( res => {
	var word_id = res;
	readWord(res)
	//console.log("word_id: " + word_id)
	//readWord(res)
	//succeedTest(res)
	//on utilise word_id ici
},
 fail => console.log("promise failed"));

getSrsSize("111")
.then( res => {
	var srs_size = res;
	//console.log(srs_size)
	//on utilise word_id ici
},
fail => console.log("promise failed"));



addWordsToSrs("111", [])
.then( res => {
	//console.log(res)
	//on utilise word_id ici
},
 fail => console.log("promise failed"));

findAllSrsWords("111")
.then( res => {
	//console.log(res)
	//on utilise word_id ici
},
fail => console.log("promise failed"));


findWordsByLevel("abc", 0)
.then( res => {
	//console.log( res)
	//on utilise word_id ici
},
 fail => console.log("promise failed"));
//console.log(Srs.aggregate([{ $match: { userId: "999"  }}]));
//console.log(wordList);

/*db.articles.aggregate( [
  { $match: { $or: [ { score: { $gt: 70, $lt: 90 } }, { views: { $gte: 1000 } } ] } },
  { $group: { _id: null, count: { $sum: 1 } } }
] );*/
//readWord("5b35e140fd68c817bd175064")
/*readWord("5b35e140fd68c817bd175066")
readWord("5b35e90c625fb31994e1cab6")*/
//readWord("5b35e90d625fb31994e1cab8")
findWordsToLearn("abc")
.then(res =>{
	console.log();
	console.log("/////////// WORDS TO LEARN ////////////")
	console.log();
	console.log(res)
})
