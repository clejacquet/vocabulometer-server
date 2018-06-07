module.exports = (mongoose, models) => {
    const wordEnglishSchema = new mongoose.Schema({
        userId: mongoose.Schema.Types.ObjectId,
        word: String,
        time: { type: Date, default: Date.now }
    }, {collection: 'words_en'});

    const model = mongoose.model('EnglishWords', wordEnglishSchema);

    model.addReadWords = (words, userId, cb) => {
        model.create(words.map(word => ({
            userId: userId,
            word: word
        })), (err, result) => {
            if (err) {
                return cb(err);
            }

            return cb(undefined, result);
        })
    };

    return model;
};