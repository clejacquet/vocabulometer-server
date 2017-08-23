const bcrypt = require('bcrypt');
const stopwords = require('./stopwords');

module.exports = (mongoose, models) => {
	const userSchema = new mongoose.Schema({
		name: String,
		password: String,
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
					password: hash
				}, (err, res) => {
					if (err) {
						return cb(err);
					}
					cb(null, {

					})
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

	function similarTexts(userId, sort, limit, cb) {
		try {
			models.users.aggregate([
				{
					$match: {
						_id: userId
					}
				},
				{
					$unwind: '$words'
				},
				{
					$group: {
						_id: '$words.word',
						count: { $sum: 1 },
						last_time: {
							$max: '$words.time'
						}
					}
				},
				{
					$sort: {
						count: -1
					}
				},
				{
					$group: {
						_id: 0,
						values: { $push: "$_id" }
					}
				}
			]).cursor({ batchSize: 1000 }).exec().next().then(values => {
				if (!values) {
					return cb(null, {});
				}

				models.texts.aggregate([
					{
						$unwind: "$text.body"
					},
					{
						$project: {
							body: {
								$let: {
									vars: {
										stopWords: stopwords
									},
									in: {
										$filter: {
											input: "$text.body",
											as: "pair",
											cond: {
												$and: [
													{ $eq: [ "$$pair.token", "WORD" ] },
													{ $not: { $in: [ { $toLower: "$$pair.value" },  "$$stopWords"] } }
												]
											}
										}
									}
								}
							},
							title: "$text.title"
						}
					},
					{
						$unwind: "$body"
					},
					{
						$group: {
							_id: { _id: "$_id", title: "$title" },
							words: { $addToSet: { $toLower: "$body.value" } }
						}
					},
					{
						$project: {
							_id: "$_id._id",
							title: "$_id.title",
							score: {
								$divide: [ { $size: { $setIntersection: [ "$words", values.values ] } }, { $size: "$words" } ]
							}
						}
					},
					{
						$sort: {
							score: sort
						}
					},
					{
						$limit: limit
					}
				], cb);
			});
		} catch( err ){
			console.error(err);
		}
	}

	model.findOneOrCreate = (condition, doc, cb) => {
		model.findOne(condition, (err, result) => {
			return result
				? cb(err, result)
				: model.create(doc, (err, result) => {
					return cb(err, result);
				});
		});
	};

	model.addWord = (word, userId, cb) => {
		try {
			model.findOne({ _id: userId }, (err, doc) => {
				if (!doc) {
					return cb(null, null);
				}

				doc.words.push({ word: word });
				doc.save((err) => {
					cb(err, doc);
				});
			});
		} catch( err ){
			console.error(err);
		}
	};

	model.getSimilarTexts = (userId, cb) => {
		similarTexts(userId, -1, 100, cb);
	};

	model.getEasyTexts = (userId, count, cb) => {
		similarTexts(userId, -1, count, cb);
	};

	model.getHardTexts = (userId, count, cb) => {
		similarTexts(userId, 1, count, cb);
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

	return model;
};

