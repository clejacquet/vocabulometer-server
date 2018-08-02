const moduleLoader = require('./modules/moduleLoader');
const youtube = require('./models/youtube');
const constants = require('./constants');

const Mongoose = require('mongoose').Mongoose;
Mongoose.Promise = require('bluebird');
const winston = require('winston');
const async = require('async');

/*
   The model follows this structure:

    model
     |- languages
     |   |- english
     |   \- japanese
     |- modules
     |   |- english
     |   |   |- en_module1
     |   |   |- en_module2
     |   |   \- ...
     |   \- japanese
     |       |- jp_module1
     |       |- jp_module2
     |       \- ...
     |- datasets
     |   |- english
     |   |   |- en_dataset1
     |   |   |- en_dataset2
     |   |   \- ...
     |   \- japanese
     |       |- jp_dataset1
     |       |- jp_dataset2
     |       \- ...
     |- users
     |   |- wordResults
     |   |   |- english
     |   |   \- japanese
     |   \- wordReadings
     |       |- english
     |       \- japanese
     |- texts
     |- nlp
     \- youtube

 */

module.exports = (cb) => {

    // Each task retrieves a connection source object asynchronously
    const tasks = [

        // This task is for retrieving the connection source of the main MongoDB database
        (cb1) => {
            const connectionString = constants.mainDb;

            const mongoose = new Mongoose();
            mongoose.connect(connectionString, {
                user: constants.mainDbUser,
                pass: constants.mainDbPass
            })
                .then(() => cb1(undefined, mongoose))
                .catch((err) => cb1(err));
        },

        // This task is for retrieving the connection source of the MongoDB text database
        (cb1) => {
            const connectionString = constants.textDb;

            const mongoose = new Mongoose();
            mongoose.connect(connectionString, {
                user: constants.textDbUser,
                pass: constants.textDbPass
            })
                .then(() => cb1(undefined, mongoose))
                .catch((err) => cb1(err));
        },

        // This task is for retrieving the connection source for accessing Youtube API
        (cb1) => {
            youtube.authenticate(constants.youtubeRedirectUri, (err, result) => {
                if (err) {
                    return cb1(err);
                }

                if (result === false) {
                    winston.log('info', 'Cannot authenticate on Youtube API. Please check if "client_secret.json" file exists and is correct');
                    return cb1();
                }

                youtube.activate(cb1);
            })
        }
    ];

    // Once the connections are loaded, the following function is called, with all connection objects stored in
    // the "connections" parameter
    async.parallel(tasks, (err, connections) => {
        if (err) {
            winston.log('error', 'Connection error: %s', err);
            return cb(err);
        }

        // The models are loaded here

        const models = {};

        models.languages = {
            english: {
                levels: [
                    'Level 1',
                    'Level 2',
                    'Level 3',
                    'Level 4',
                    'Level 5',
                    'Level 6',
                    'Level 7',
                    'Level 8',
                    'Level 9',
                    'Level 10',
                ],
                format: collectionName => `${collectionName}_en`,
                nlpUri: constants.nlpEnAddress
            },
            japanese: {
                levels: [
                    'N5', 'N4', 'N3', 'N2', 'N1'
                ],
                format: collectionName => `${collectionName}_jp`,
                nlpUri: constants.nlpJpAddress
            },
        };

        models.toObjectID = id => connections[0].Types.ObjectId(id);

        // Model for NLP treatments
        models.nlp = require('./models/nlp');

        // Model for User-related tasks
        models.users = require('./models/users')(connections[0], models);

        // Model for Text-related tasks
        models.texts = require('./models/texts')(connections[1], models);

        // Model for Youtube-related tasks
        models.youtube = youtube;

        // Model for feedbacks
        models.feedbacks = require('./models/feedback')(connections[0], models);

        // Model for news feed
        models.news = require('./models/news')(connections[1], models);

        // Model for news feed
        models.srs = require('./models/srs')(connections[0], models);

        // Loading the recommendation system models
        models.recommenders = {
            easy: require('./recommenders/easy'),
            hard: require('./recommenders/hard'),
            review: require('./recommenders/review')
        };

        // Loading the content source module models (currently "Text" and "Youtube")
        moduleLoader(models, (err, modules) => {
            if (err) {
                return cb(err);
            }
            models.modules = modules;
            models.datasets = {};

            const datasetsModel = require('./models/datasets');

            Object.keys(modules).forEach((language) => {
                models.datasets[language] = {};

                Object.values(modules[language]).forEach(module => {
                    models.datasets[language][module.name] = datasetsModel(module.name, models.languages[language], connections[0]);
                });
            });


            cb(undefined, models);
        });
    });
};