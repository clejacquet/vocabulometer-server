module.exports = (usersModel, userId, dataset, sort, limit, cb) => {
    try {
        usersModel.knownWords(userId, (err, words) => {
            if (err) {
                return cb(err);
            }

            if (!words) {
                return cb(null, {});
            }

            words = words.map(word => word.word);

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