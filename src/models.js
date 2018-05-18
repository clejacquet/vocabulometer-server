const moduleLoader = require('./modules/moduleLoader');

const Mongoose = require('mongoose').Mongoose;
Mongoose.Promise = require('bluebird');
const winston = require('winston');
const async = require('async');


module.exports = (cb) => {
    const tasks = [
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

        (cb2) => {
            const connectionString = 'mongodb://' + (process.env.MONGO_TEXTS_ADDRESS || 'mongo/vocabulometer-texts');

            const mongoose = new Mongoose();
            mongoose.connect(connectionString, {
                user: 'clejacquet',
                pass: 'clejacquet-imp'
            })
                .then(() => cb2(undefined, mongoose))
                .catch((err) => cb2(err));
        },
    ];

    async.parallel(tasks, (err, connections) => {
        if (err) {
            winston.log('error', 'Connection error: %s', err);
            return cb(err);
        }

        const models = {};

        models.toObjectID = id => connections[0].Types.ObjectId(id);

        models.users = require('./models/users')(connections[0], models);

        models.texts = require('./models/texts')(connections[1], models);

        models.recommenders = {
            easy: require('./recommenders/easy'),
            hard: require('./recommenders/hard'),
            review: require('./recommenders/review')
        };

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