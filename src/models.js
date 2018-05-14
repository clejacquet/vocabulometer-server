const moduleLoader = require('./modules/moduleLoader');

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const winston = require('winston');


module.exports = (cb) => {
    const connectionString = 'mongodb://' + (process.env.MONGO_ADDRESS || 'mongo/vocabulometer');

	mongoose.connect(connectionString, {
		user: 'clejacquet',
		pass: 'clejacquet-imp'
	});

	const db = mongoose.connection;
	db.on('error', (err) => {
		winston.log('error', 'Connection error: %s', err);
	});

	db.once('open', () => {
		const models = {};

		models.toObjectID = id => mongoose.Types.ObjectId(id);

		models.texts = require('./models/texts')(mongoose, models);
		models.users = require('./models/users')(mongoose, models);
		models.scores = require('./models/score')(mongoose, models);
		models.userWordScores = require('./models/userWordScores')(mongoose, models);

		models.recommenders = {
			easy: (dataset, cb) => cb(undefined, 'easy:' + dataset),
			hard: (dataset, cb) => cb(undefined, 'hard:' + dataset),
			review: (dataset, cb) => cb(undefined, 'review:' + dataset)
		};

		moduleLoader((err, modules) => {
			if (err) {
				return cb(err);
			}
			models.modules = modules;
            cb(undefined, models);
		});
	});
};