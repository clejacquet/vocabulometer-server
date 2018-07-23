
//Creation of the Word class and SRS class

var Word = {
    word: "",      //the word spelling
    readNb: 0,     //the number of times te word has been read
    lv: 0,         //word level
    testSuccess: 0, //number of consecutive test successes
    lastSeen: 0,   //time since the word has not been seen
    srs: 0,        // if the word has entered the srs list

    // Methods
    createWord: function(word) {
      this.word = word;
      this.readNb = 0;
      this.lv = 0;
      this.testSuccess = 0;
      this.lastSeen = 9999999999;
      this.srs = 0;
    },
    setWord: function(word, readNb, lv, testSuccess){
      this.word = word;
      this.readNb = readNb;
      this.lv = lv;
      this.testSuccess = testSuccess;
      this.lastSeen = 9999999999;
      this.srs = 0;
    },

    readWord: function() {
      this.readNb += 1;
      this.lastSeen = new Date().getTime();
    },
    lvUp: function() {
      this.lv += 1;
    },
    lvDown: function() {
      this.lv -= 1;
    },
    succeedTest: function() {
      this.testSuccess += 1;
    },
    resetTest: function() {
      this.testSuccess = 0;
    },
    enterSrs: function() {
      this.srs = 1;
    }

};


module.exports = Word;
