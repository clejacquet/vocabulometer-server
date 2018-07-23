module.exports = (name, languageModel, mongoose) => {
    const datasetSchema = new mongoose.Schema({
        uri: {
            type: String,
            unique: true
        },
        title: String,
        words: [String]
    }, {
        collection: languageModel.format(`dataset_${name}`)
    });

    return mongoose.model(languageModel.format(name), datasetSchema);
};

