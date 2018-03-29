module.exports = (mongoose, models) => {
	const UserWordScoresSchema = new mongoose.Schema({
		userId: mongoose.Schema.Types.ObjectId,
		scores: [{
			word: String,
			score: Number
		}]
	});

	UserWordScoresSchema.statics.saveScores = function(userId, scores, cb) {
		this.update(
			{
				userId: userId
			},
			{
				scores: scores
			},
			{
				upsert: true
			}, cb);
	};

	return mongoose.model('UserWordScores', UserWordScoresSchema);
};
