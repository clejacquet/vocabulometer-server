module.exports = (name, mongoose) => {
    const datasetSchema = new mongoose.Schema({
        uri: {
            type: String,
            unique: true
        },
        title: String,
        words: [String]
    });

    return mongoose.model(name, datasetSchema);
};

