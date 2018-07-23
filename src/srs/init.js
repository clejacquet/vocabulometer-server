//var fetch = require('fetch');
var fetch = require('node-fetch');
var fs = require('fs')
var readline = require('readline');
var mongoose = require('mongoose');
//var ObjectId = mongoose.ObjectId;
var ObjectId = mongoose.Types.ObjectId();

// import of libraries
var Word_local = require('./Word');
var srslib = require('./srslib');



// DATABASE CONNECTION
var MONGO_ADDRESS = "ds151820.mlab.com:51820/vocabulometer-dev"
var USER_ID = "333";

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
var Srs = mongoose.model("srs", SrsSchema);
//declaration of the SRS List and every wordlist

function parseFile(inputFile) {    //retrieve the words from the file and put them inside the wordList
  var text = fs.readFileSync(inputFile).toString()
  text = text.split(/\r\n|\r|\n/g)

  for(let i = 0; i<1000; i++){
    //console.log(text[i]);
    var currentWord = new Srs({word: text[i]});
    currentWord.save(function (err, srs) {
      if (err) return console.error(err);
      //console.log(srs)
    });

    /*var currentWord = Object.create(Word_local);
    currentWord.createWord(text[i]);
    list.push(currentWord);*/
  }
}

parseFile('headwords/headwords-1.txt');

/*parseFile('headwords/headwords-2.txt', wordList2);
parseFile('headwords/headwords-3.txt', wordList3);
parseFile('headwords/headwords-4.txt', wordList4);
parseFile('headwords/headwords-5.txt', wordList5);
parseFile('headwords/headwords-6.txt', wordList6);
parseFile('headwords/headwords-7.txt', wordList7);
parseFile('headwords/headwords-8.txt', wordList8);
parseFile('headwords/headwords-9.txt', wordList9);
parseFile('headwords/headwords-10.txt', wordList10);*/
