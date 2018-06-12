const moduleLoader = require('./modules/moduleLoader');
const youtube = require('./models/youtube');

const Mongoose = require('mongoose').Mongoose;
Mongoose.Promise = require('bluebird');
const winston = require('winston');
const async = require('async');


module.exports = (cb) => {

    // Each task retrieves a connection source object asynchronously
    const tasks = [

        // This task is for retrieving the connection source of the main MongoDB database
        (cb1) => {
            const connectionString = 'mongodb://' + (process.env.MONGO_ADDRESS || 'mongo/vocabulometer');

            const mongoose = new Mongoose();
            mongoose.connect(connectionString, {
                user: 'clejacquet',
                pass: 'clejacquet-imp'
            })
                .then(() => cb1(undefined, mongoose))
                .catch((err) => cb1(err));
        },

        // This task is for retrieving the connection source of the MongoDB text database
        (cb1) => {
            const connectionString = 'mongodb://' + (process.env.MONGO_TEXTS_ADDRESS || 'mongo/vocabulometer-texts');

            const mongoose = new Mongoose();
            mongoose.connect(connectionString, {
                user: 'clejacquet',
                pass: 'clejacquet-imp'
            })
                .then(() => cb1(undefined, mongoose))
                .catch((err) => cb1(err));
        },

        // This task is for retrieving the connection source for accessing Youtube API
        (cb1) => {
            youtube.authenticate(process.env.YT_REDIRECT_URI || 'http://vocabulometer.herokuapp.com/admin', (err, result) => {
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

        models.toObjectID = id => connections[0].Types.ObjectId(id);

        // Model for NLP treatments
        models.nlp = require('./models/nlp');

        // Model for User-related tasks
        models.users = require('./models/users')(connections[0], models);

        // Model for Text-related tasks
        models.texts = require('./models/texts')(connections[1], models);

        // Model for Youtube-related tasks
        models.youtube = youtube;

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

            Object.values(modules).map((module) => {
                models.datasets[module.name] = datasetsModel(module.name, connections[0]);
            });


            cb(undefined, models);
        });
    });
};