const translate = require('google-translate-api')





module.exports = (mongoose, models) => {
    var SrsSchema = new mongoose.Schema({
        word: { type: String, required: true},
        readNb: { type: Number, required: true, default: 0 },
        lv: { type: Number, required: true, default: 0 },
        testSuccess: { type: Number, default: 0},
        lastSeen : { type: Date, default: 0},
        userId : { type: String, default: '1'}
    });

    SrsSchema.statics.readWord = function (word_id) {
        var time = new Date()/*.toISOString()*/;
        this.findOneAndUpdate({'_id': word_id},
            {
                $set:{'lastSeen': time},
                $inc: {'readNb': 1 }
            },
            function(err, doc){
                if (err) return console.error(err);
                else {
                    //if(doc.lv === 0) this.lvUp(doc._id);
                    //if(doc.lv === 1 && doc.readNb >= 5) this.lvUp(doc._id);
                    //if(doc.lv === 2 && doc.readNb >= 12 && doc.testSuccess >= 1) lvUp(doc._id);
                    //if(doc.lv === 3 && doc.readNb >= 18 && doc.testSuccess >= 2) lvUp(doc._id);
                    //if(doc.lv === 4 && doc.readNb >= 25 && doc.testSuccess >= 5) lvUp(doc._id);
                    console.log("Word read");
                    console.log(time)
                }
            });
    };

    SrsSchema.statics.getSrsSize = function(user_id) { //count the number of words in an user's SRS
        return new Promise((resolve, reject) => {
            var srsSize = 0;
            this.aggregate( [
                { $match: { userId: user_id  } },
                { $group: { _id: null, count: { $sum: 1 }}}], function (err, result) {
                if (err) return reject(err);
                if (result.length){
                    srsSize = result[0].count;
                    return resolve(srsSize);
                }
            });
        })
    };

    SrsSchema.statics.lvUp = function(id) {
        var newlv = 0;
        this.findOne({'_id': id},function(err,doc){ //mettre le findone and update dans le callback
            if(err) return console.error(err)
            else newlv = doc.lv + 1;
         }, this.findOneAndUpdate({'_id': id},
            {
                $set:{'testSuccess': 0},
                $inc: {'lv': 1 }
            },
            function(err, doc){
                if (err) return console.error(err);
                else {
                    console.log("Word level up: lv " + newlv);
                }
            }))

    };

    SrsSchema.statics.lvDown = function(id) {
        this.findOneAndUpdate({'_id': id},
            {$inc: {'lv': -1 }},
            function(err, doc){
                if (err) return console.error(err);
                else console.log("Word level down");
            });
    };

    SrsSchema.statics.findAllSrsWords = function(user_id){ //return all words of a specific user
        return new Promise((resolve, reject) => {
            this.aggregate( [
                { $match: { userId: user_id  } }], function (err, result) {
                if (err) return reject(err);
                if (result.length){
                    return resolve(result)
                }
            });
        })
    };

    SrsSchema.statics.timeDiff = function (dateold, datenew) {
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
    };

    SrsSchema.statics.findWordsByLastSeen = function (user_id, time) { //find all words that haven't be since since timeLastSeen
        return new Promise((resolve, reject) => {
            var currentDate = new Date();
            var idList = [];
            console.log("last seen")
            console.log(user_id)
            this.aggregate([
                {$match: {userId: user_id}}], (err, result) => {
                if (err) console.log(err);
                if(result.length) {
                    console.log(result)
                    for (let i = 0; i < result.length; i++) {
                        if (this.timeDiff(result[i].lastSeen, currentDate) > time * 3600 * 1000) {
                            //console.log(timeDiff(res[i].lastSeen, currentDate));
                            idList.push(result[i])
                            console.log(result[i])
                            //console.log(res[i].word)
                        }
                    }
                    if (!idList.length) console.log("No remaining words last seen");
                    console.log("before resolve")
                    return resolve(idList);
                }
            })
        })
    };

    return mongoose.model("srs", SrsSchema);
};
