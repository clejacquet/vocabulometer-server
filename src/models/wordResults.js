const lastReviews = require('./aggregations/lastReviews');

module.exports = (mongoose, models) => {
    const results = {};

    Object.keys(models.languages).forEach(name => {
        const languageModel = models.languages[name];

        const wordResultsSchema = new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
            word: String,
            result: Boolean,
            time: { type: Date, default: Date.now }
        }, {collection: languageModel.format('word_results')});


        wordResultsSchema.statics.saveResult = function(wordResults, userId, cb) {
            this.create(wordResults.map(result => ({
                userId: userId,
                word: result.word,
                result: result.value
            })), cb)
        };

        wordResultsSchema.statics.lastReviews = function(userId, limit, cb) {
            this.aggregate(lastReviews(userId, limit, languageModel), (err, reviews) => {
                if (err) {
                    return cb(err);
                }

                cb(undefined, reviews.map(review => ({
                    word: review.word,
                    time: review.time,
                    result: review.result,
                    status: review.status,
                    level: languageModel.levels[review.level - 1]
                })));
            });
        };

        results[name] = mongoose.model(languageModel.format('WordResult'), wordResultsSchema);
    });

    return results;
};