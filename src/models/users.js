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

	const userSchema = new mongoose.Schema({
		name: String,
		password: String,
		role: String
	});

    userSchema.methods.validPassword = function (password, cb) {
        bcrypt.compare(password, this.password)
            .then((res) => {
                cb(null, res);
            }).catch((err) => {
            cb(err);
        });
    };

    userSchema.statics.wordResults = require('./wordResults')(mongoose, models);

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
                    cb(null, {
                        _id: res._id,
                        name: res.name,
                        isNewEn: true,
                        isNewJp: true
                    });
                });
            }).catch((err) => {
            cb(err);
        });
    };

    const defaultScore = () => ({
        value: 0,
        apprentice: 0,
        guru: 0,
        master: 0,
        enlightened: 0
    });

    userSchema.statics.getScorePerLevels = function(userId, language, cb) {
        const languageModel = models.languages[language];
        const levelCount = languageModel.levels.length;

        this.aggregate(levelScore(userId, languageModel),
			(err, doc) => {
    			if (err) {
    				return cb(err);
				}

				if (doc.length === 0) {
    			    return cb({
                        status: 400,
                        error: 'No user of that ID'
                    });
                }

                doc = doc[0];

				const levels = Array(levelCount).fill(0).map((_, i) => {
				    const reading = doc.reading.find((level) => level._id === i + 1);
				    const quiz = doc.quiz.find((level) => level._id === i + 1);

				    let level;

				    if (reading && quiz) {
				        level = {
				            _id: i + 1,
                            score: reading.score,
                            known: reading.known,
                            known_avg: reading.known_avg,
                            ratio: quiz.ratio,
                            confidence: quiz.confidence,
                        }
                    } else if (reading || quiz) {
				        if (reading) {
				            level = {
                                _id: i + 1,
                                score: reading.score,
                                known: reading.known,
                                known_avg: reading.known_avg,
                                ratio: 0,
                                confidence: 0
                            }
                        } else {
                            level = {
                                _id: i + 1,
                                score: defaultScore(),
                                known: 0,
                                known_avg: 0,
                                ratio: quiz.ratio,
                                confidence: quiz.confidence
                            }
                        }
                    } else {
                        level = {
                            _id: i + 1,
                            score: defaultScore(),
                            known: 0,
                            known_avg: 0,
                            ratio: 0,
                            confidence: 0
                        }
                    }

                    level.prob = level.ratio + level.known_avg - level.ratio * level.known_avg;
				    level.prediction = Math.ceil(level.prob * 100);

				    level.title = languageModel.levels[i];

                    return level;
                });

				cb(undefined, levels);
			});
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

    userSchema.statics.addWords = function(words, userId, language, cb) {
        this.wordsReading[language].addReadWords(words, userId, (err, result) => {
			if (err) {
				return cb(err);
			}

			cb(undefined, result);
		});
	};

    userSchema.statics.getWordsPerDay = function(userId, language, count, cb) {
		this.aggregate(wordsPerDay(userId, models.languages[language], count), cb);
	};

    userSchema.statics.getNewWordsPerDay = function(userId, language, count, cb) {
		this.aggregate(newWordsPerDay(userId, models.languages[language], count), cb);
	};

    userSchema.statics.getRecentNewWords = function(userId, language, count, cb) {
        const languageModel = models.languages[language];

		this.aggregate(recentNewWords(userId, languageModel, count), (err, words) => {
		    if (err) {
		        return cb(err);
            }

            cb(undefined, words.map(word => {
                word.level = languageModel.levels[word.level - 1];
                return word;
            }));
        });
	};

    userSchema.statics.knownWords = function(userId, language, cb) {
        this.aggregate(computeVocabulary(userId, models.languages[language]), (err, user) => {
            if (err) {
                return cb(err);
            }

            if (user.length === 0) {
                return cb(undefined, { known: [] });
            }

            const vocab = user[0].vocab;

            cb(undefined, { known: vocab });
        });
	};

	userSchema.statics.getQuiz = function(language, cb) {
        fs.readFile(models.languages[language].format('assets/list-questions') + '.json', 'utf8', (err, file) => {
            if (err) {
                return cb(err);
            }

            const questions = JSON.parse(file);

            cb(undefined, questions);
        });
    };

    const model = mongoose.model('User', userSchema);

    model.wordsReading = require('./wordReadings')(mongoose, models);

    return model;
};

