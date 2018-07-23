module.exports = (mongoose, models) => {
    const results = {};

    Object.keys(models.languages).forEach(name => {
        const formatter = models.languages[name];

        const wordResultsSchema = new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
            word: String,
            result: Boolean,
            time: { type: Date, default: Date.now }
        }, {collection: formatter.format('word_results')});


        wordResultsSchema.statics.saveResult = function(wordResults, userId, cb) {
            this.create(wordResults.map(result => ({
                userId: userId,
                word: result.word,
                result: result.value
            })), cb)
        };

        results[name] = mongoose.model(formatter.format('WordResult'), wordResultsSchema);
    });

    return results;
};