const bcrypt = require('bcrypt');
const winston = require('winston');
const fs = require('fs');
const _ = require('underscore');

const levelScore = require('./aggregations/levelScore');
const wordsPerDay = require('./aggregations/wordsPerDay');
const newWordsPerDay = require('./aggregations/newWordsPerDay');
const recentNewWords = require('./aggregations/recentNewWords');
const computeVocabulary = require('./aggregations/computeVocabulary');


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

    const wordsRead = {
        english: require('./wordsEnglish')(mongoose, models)
    };

    userSchema.methods.validPassword = function (password, cb) {
        bcrypt.compare(password, this.password)
            .then((res) => {
                cb(null, res);
            }).catch((err) => {
            cb(err);
        });
    };

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

    userSchema.statics.getScorePerLevels = function(userId, cb) {
        wordsRead.english.aggregate(levelScore(userId),
			(err, levels) => {
    			if (err) {
    				return cb(err);
				}

				cb(undefined, levels);
			});
	};

    userSchema.statics.updateUserInfo = function(userId, cb) {
        this.aggregate(computeVocabulary(userId),
            (err, user) => {
                if (err) {
                    return cb(err);
                }

                if (user.length === 0) {
                    return cb(undefined, { known: [] });
                }

                const vocab = user[0].vocab;

                this.update({ _id: userId }, {
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



    userSchema.statics.findOneOrCreate = function(condition, doc, cb) {
		this.findOne(condition, (err, result) => {
			return result
				? cb(err, result)
				: model.create(doc, (err, result) => {
					return cb(err, result);
				});
		});
	};

    userSchema.statics.addWords = function(words, userId, cb) {
        wordsRead.english.addReadWords(words, userId, (err, result) => {
			if (err) {
				return cb(err);
			}

			this.updateUserInfo(userId, () => {});
			cb(undefined, result);
		});
	};

    userSchema.statics.getWordsPerDay = function(userId, count, cb) {
		this.aggregate(wordsPerDay(userId, count), cb);
	};

    userSchema.statics.getNewWordsPerDay = function(userId, count, cb) {
		this.aggregate(newWordsPerDay(userId, count), cb);
	};

    userSchema.statics.getRecentNewWords = function(userId, count, cb) {
		this.aggregate(recentNewWords(userId, count), cb);
	};

    userSchema.statics.saveWordsFromQuizResult = function(userId, level, cb) {
		const levels = Array(10).fill(1).map((item, i) => ({
			level: i + 1,
			ratio: 1
		}));
		const index = levels.map(level => level.level).indexOf(level);

	    this
			.where({ _id: userId })
			.update({ levels: levels.slice(0, index + 1) })
			.then(() => {
				cb();

                this.updateUserInfo(userId, (err, result) => {
                    if (err) {
                        return winston.log('info', err);
                    }

                    winston.log('info', result);
                });
			})
			.catch((err) => cb(err));
    };

    userSchema.statics.knownWords = function(userId, cb) {
		this.findOne({_id: userId}, ['known'], (err, user) => {
			if (err) {
				return cb(err);
			}

			if (user.known.length === 0) {
				this.updateUserInfo(userId, (err1, vocab) => {
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

	userSchema.statics.getQuiz = function(cb) {
        fs.readFile('assets/list-questions.json', 'utf8', (err, file) => {
            if (err) {
                return cb(err);
            }

            const listQuestions = JSON.parse(file);

            const questions = listQuestions.map(list => _.sample(list, 3));

            cb(undefined, questions);
        });
    };

	return mongoose.model('User', userSchema);
};

