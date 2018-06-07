const bcrypt = require('bcrypt');
const winston = require('winston');
const fs = require('fs');
const async = require('async');
const _ = require('underscore');

module.exports = (mongoose, models) => {
    const levelItem = new mongoose.Schema({
		level: Number,
        score: {
            type: Number,
            default: 0,
            optional: false
        },
		ratio: {
        	type: Number,
			default: 0,
			optional: false
		}
    }, { _id: false });

    const knownItem = new mongoose.Schema({
        word: String,
        level: Number,
        status: Number
    }, { _id: false });

	const userSchema = new mongoose.Schema({
		name: String,
		password: String,
        levels: [levelItem],
		role: String,
        known: [knownItem],
	});

	userSchema.statics.storeUser = function (username, password, cb) {
		bcrypt.hash(password, 10)
			.then((hash) => {
				this.create({
					name: username,
					password: hash
				}, (err, res) => {
					if (err) {
						return cb(err);
					}
					cb(null, res);
				});
			}).catch((err) => {
			cb(err);
		});
	};

    userSchema.statics.updateUserInfo = function(userId, cb) {
        this.aggregate([
            {
                "$match": {_id: userId}
            },
            {
                "$unwind": { path: "$levels", preserveNullAndEmptyArrays: true }
            },
            {
                "$match": { "$or": [ { "levels": { "$exists": false }}, { "levels.ratio": {"$gte": 0.66}} ] }
            },
            {
                "$group": {_id: "$_id", levels: {"$push": "$levels"}}
            },
            {
                "$lookup": {
                    from: "words_en",
                    localField: "_id",
                    foreignField: "userId",
                    as: "words"
                }
            },
            {
                "$unwind": { path: "$words", preserveNullAndEmptyArrays: true }
            },
            {
                "$group": {
                    _id: {word: "$words.word", userId: "$_id", levels: "$levels" },
                    count: { "$sum": 1 }
                }
            },
            {
                "$match": {
                    "$or": [ { "_id.word": { "$exists": false }}, { count: { "$gte": 12 }} ]
                }
            },
            {
                "$group": {
                    _id: "$_id.userId",
                    levels: { "$first": "$_id.levels" },
                    words: { "$push": "$_id.word" }
                }
            },
            {
                "$lookup": {
                    from: "vocabs",
                    localField: "levels.level",
                    foreignField: "level",
                    as: "levelVocab"
                }
            },
            {
                "$lookup": {
                    from: "vocabs",
                    localField: "words",
                    foreignField: "word",
                    as: "readVocab"
                }
            },
            {
                "$project": {
                    vocab: {"$setUnion": ["$levelVocab", "$readVocab"]},
                }
            },
            {
                "$project": {
                    vocab: {
                        word: 1,
                        level: 1
                    }
                }
            }
        ], (err, user) => {
            if (err) {
                return cb(err);
            }

            if (user.length === 0) {
            	return cb(undefined, { known: [] });
			}

            const vocab = user[0].vocab;

            this.update({
                _id: userId
            }, {
                '$set': {
                    known: vocab
                }
            }, {
                upsert: true,
            }, (err) => {
                if (err) {
                    return cb(err);
                }

                cb(undefined, { known: vocab });
            });
        })
    };

    userSchema.methods.validPassword = function (password, cb) {
        bcrypt.compare(password, this.password)
            .then((res) => {
                cb(null, res);
            }).catch((err) => {
            cb(err);
        });
    };

	const model = mongoose.model('User', userSchema);

	model.words = {
		english: require('./wordsEnglish')(mongoose, models)
	};

	model.findOneOrCreate = (condition, doc, cb) => {
		model.findOne(condition, (err, result) => {
			return result
				? cb(err, result)
				: model.create(doc, (err, result) => {
					return cb(err, result);
				});
		});
	};

	model.addWords = (words, userId, cb) => {
		model.words.english.addReadWords(words, userId, (err, result) => {
			if (err) {
				return cb(err);
			}

			model.updateUserInfo(userId, () => {});
			cb(undefined, result);
		});
	};

	model.getWordsPerDay = (userId, count, cb) => {
		models.users.aggregate([
			{
				$match: {
					_id: userId
				}
			},
            {
                "$lookup": {
                    from: "words_en",
                    localField: "_id",
                    foreignField: "userId",
                    as: "words"
                }
            },
			{
				$unwind: "$words"
			},
			{
				$project: {
					"words.word": "$words.word",
					"words.day": {
						$subtract: [
							"$words.time",
							{
								$add: [
									{ $multiply: [{$hour: '$words.time'}, 3600000]},
									{ $multiply: [{$minute: '$words.time'}, 60000]},
									{ $multiply: [{$second: '$words.time'}, 1000]},
									{ $millisecond: '$words.time'}
								]
							}
						]
					},
				}
			},
			{
				$group: {
					_id: "$words.day",
					count: { $sum: 1 }
				}
			},
			{
				$sort: {
					_id: -1,
				}
			},
			{
				$limit: count
			}
		], cb);
	};

	model.getNewWordsPerDay = (userId, count, cb) => {
		models.users.aggregate([
			{
				$match: {
					_id: userId
				}
			},
            {
                "$lookup": {
                    from: "words_en",
                    localField: "_id",
                    foreignField: "userId",
                    as: "words"
                }
            },
			{
				$unwind: "$words"
			},
			{
				$group: {
					_id: "$words.word",
					time: {
						$min: "$words.time"
					}
				}
			},
			{
				$project: {
					"day": {
						$subtract: [
							"$time",
							{
								$add: [
									{ $multiply: [{$hour: '$time'}, 3600000]},
									{ $multiply: [{$minute: '$time'}, 60000]},
									{ $multiply: [{$second: '$time'}, 1000]},
									{ $millisecond: '$time'}
								]
							}
						]
					},
				}
			},
			{
				$group: {
					_id: "$day",
					count: { $sum: 1 }
				}
			}, {
				$sort: {
					_id: -1
				}
			}, {
				$limit: count
			}
		], cb);
	};

	model.getRecentNewWords = (userId, count, cb) => {
		models.users.aggregate([
			{
				$match: {
					_id: userId
				}
			},
            {
                "$lookup": {
                    from: "words_en",
                    localField: "_id",
                    foreignField: "userId",
                    as: "words"
                }
            },
			{
				$unwind: "$words"
			},
			{
				$group: {
					_id: "$words.word",
					time: {
						$min: "$words.time"
					}
				}
			},
			{
				$sort: {
					time: -1
				}
			}, {
				$limit: count
			}
		], cb);
	};

	model.saveWordsFromQuizResult = (userId, level, cb) => {
		const levels = Array(10).fill(1).map((item, i) => ({
			level: i + 1,
			ratio: 1
		}));
		const index = levels.map(level => level.level).indexOf(level);

	    models.users
			.where({ _id: userId })
			.update({ levels: levels.slice(0, index + 1) })
			.then(() => {
				cb();

                models.users.updateUserInfo(userId, (err, result) => {
                    if (err) {
                        return winston.log('info', err);
                    }

                    winston.log('info', result);
                });
			})
			.catch((err) => cb(err));
    };

	model.knownWords = (userId, cb) => {
		models.users.findOne({_id: userId}, ['known'], (err, user) => {
			if (err) {
				return cb(err);
			}

			if (user.known.length === 0) {
				models.users.updateUserInfo(userId, (err1, vocab) => {
					if (err1) {
						return cb(err1);
					}

					cb(undefined, vocab);
				})
			} else {
				cb(undefined, user.known);
			}
		})
	};

	model.getQuiz = (cb) => {
        fs.readFile('assets/list-questions.json', 'utf8', (err, file) => {
            if (err) {
                return cb(err);
            }

            const listQuestions = JSON.parse(file);

            const questions = listQuestions.map(list => _.sample(list, 3));

            cb(undefined, questions);
        });
    };

	return model;
};

