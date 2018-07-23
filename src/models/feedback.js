module.exports = (mongoose, models) => {
    const feedbackSchema = new mongoose.Schema({
        value: String,
        dataset: String,
        language: String,
        userId: mongoose.Schema.Types.ObjectId,
        uri: String,
        time: { type: Date, default: Date.now }
    });

    feedbackSchema.statics.saveFeedback = function(userId, uri, feedback, dataset, language, cb) {
        this.create({
            value: feedback,
            dataset: dataset,
            language: language,
            userId: userId,
            uri: uri
        }, cb);
    };

    return mongoose.model('Feedback', feedbackSchema);
};