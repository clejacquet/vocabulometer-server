const bcrypt = require('bcrypt');
const winston = require('winston');
const fs = require('fs');
const async = require('async');
const _ = require('underscore');

module.exports = (mongoose, models) => {
	const userSchema = new mongoose.Schema({
		name: String,
		password: String,
        hasVocabSaved: Boolean,
		words: [{
			word: String,
			time: { type: Date, default: Date.now }
		}]
	});

	userSchema.statics.storeUser = function (username, password, cb) {
		bcrypt.hash(password, 10)
			.then((hash) => {
				this.create({
					name: username,
					password: hash,
					hasVocabSaved: false
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

	userSchema.methods.validPassword = function (password, cb) {
		bcrypt.compare(password, this.password)
			.then((res) => {
				cb(null, res);
			}).catch((err) => {
				cb(err);
			});
	};

	const model = mongoose.model('User', userSchema);

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
		try {
			model.findOne({ _id: userId }, (err, doc) => {
				if (!doc) {
					return cb(null, null);
				}

				doc.words.push(... words.map((word) => { return {word: word}; }));
				doc.save((err) => {
					cb(err, doc);
				});
			});
		} catch( err ){
			winston.log('error', err);
		}
	};

	model.getWordsPerDay = (userId, count, cb) => {
		models.users.aggregate([
			{
				$match: {
					_id: userId
				}
			},
			{
				$project: {
					words: "$words"
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
				$project: {
					words: "$words"
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
				$project: {
					words: "$words"
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

	model.saveWordsFromQuizResult = (userId, result, cb) => {
	    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

        const end = levels.indexOf(result);

        if (end === -1) {
            return cb(undefined, []);
        }

        async.map(levels.slice(0, end + 1), (level, cb1) => {
            fs.readFile('assets/cefr_levels/' + level + '.txt', 'utf8', (err, data) => {
                if (err) {
                    return cb1(err);
                }

                const words = data
                    .replace(/\r/g, '')
                    .split('\n');

                cb1(undefined, words);
            });
        }, (err, results) => {
            if (err) {
                return cb(err);
            }

            async.parallel([
				(cb2) => model.addWords(_(results).flatten(1), userId, cb2),
				(cb2) => {
                    model
                        .where({ _id: userId })
                        .update({ hasVocabSaved: true })
                        .then(() => cb2())
                        .catch((err) => cb2(err));
				}
			], (err) => {
            	if (err) {
            		return cb(err);
				}

				cb();
			});
        });


    };

	return model;
};

