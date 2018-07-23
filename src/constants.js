module.exports = {
    publicDirectory: process.env.VCBM_DIST_PATH || './dist',
    mainDb: 'mongodb://' + (process.env.MONGO_ADDRESS || 'mongo/vocabulometer'),
    mainDbUser: process.env.MONGO_USR,
    mainDbPass: process.env.MONGO_PWD,
    textDb: 'mongodb://' + (process.env.MONGO_TEXTS_ADDRESS || 'mongo/vocabulometer-texts'),
    textDbUser: process.env.MONGO_TEXTS_USR,
    textDbPass: process.env.MONGO_TEXTS_PWD,
    youtubeRedirectUri: process.env.YT_REDIRECT_URI || 'http://vocabulometer.herokuapp.com/admin',
    nlpEnAddress: 'http://' + (process.env.NLP_EN_ADDRESS || 'nlp') + '/vocabulometer/lemmatize',
    nlpJpAddress: 'http://' + (process.env.NLP_JP_ADDRESS || 'nlp'),
    guardianApiKey: process.env.GUARDIAN_API_KEY
};