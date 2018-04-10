const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

module.exports = (cb) => {
	// const connectionString = 'mongodb://ds062448.mlab.com:62448/vocabulometer';
    // const connectionString = 'mongodb://ds127129.mlab.com:27129/vocabulometer-dev';
    const connectionString = 'mongodb://mongo/vocabulometer';

	mongoose.connect(connectionString, {
		user: 'clejacquet',
		pass: 'clejacquet-imp'
	});

	const db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));

	db.once('open', () => {
		const models = {};

		models.toObjectID = id => mongoose.Types.ObjectId(id);

		models.stopWords = require('./models/stopwords');
		models.texts = require('./models/texts')(mongoose, models);
		models.users = require('./models/users')(mongoose, models);
		models.scores = require('./models/score')(mongoose, models);
		models.userWordScores = require('./models/userWordScores')(mongoose, models);

		cb(models);
	});
};