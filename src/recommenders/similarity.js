const winston = require('winston');

module.exports = (userId, usersModel, dataset, language, sort, limit, cb) => {
    try {
        usersModel.knownWords(userId, language, (err, words) => {
            if (err) {
                return cb(err);
            }

            if (!words) {
                return cb(null, {});
            }

            words = words.known;

            dataset.aggregate([
                {
                    $sample: { size: 150 }
                },
                {
                    $project: {
                        uri: 1,
                        title: 1,
                        score: {
                            $divide: [ { $size: { $setIntersection: [ "$words", words ] } }, { $size: "$words" } ]
                        }
                    }
                },
                {
                    $sort: {
                        score: sort
                    }
                },
                {
                    $limit: limit
                }
            ], cb);
        });
    } catch( err ){
        winston.log('error', err);
    }
};