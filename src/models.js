const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

module.exports = (cb) => {
	// const connectionString = 'mongodb://localhost/vocabnalyze';
	const connectionString = 'mongodb://ds062448.mlab.com:62448/vocabulometer';
	mongoose.connect(connectionString, {
		user: 'clejacquet',
		pass: 'clejacquet-imp'
	});

	const db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));

	db.once('open', () => {
		const models = {};

		models.toObjectID = id => mongoose.Types.ObjectId(id);

		models.texts = require('./models/texts')(mongoose, models);
		models.users = require('./models/users')(mongoose, models);

		cb(models);
	});
};