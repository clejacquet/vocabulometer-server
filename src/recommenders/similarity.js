module.exports = (usersModel, userId, dataset, sort, limit, cb) => {
    try {
        usersModel.aggregate([
            {
                $match: {
                    _id: userId
                }
            },
            {
                $unwind: '$words'
            },
            {
                $group: {
                    _id: '$words.word',
                    count: { $sum: 1 },
                    last_time: {
                        $max: '$words.time'
                    }
                }
            },
            {
                $sort: {
                    count: -1
                }
            },
            {
                $group: {
                    _id: 0,
                    values: { $push: "$_id" }
                }
            }
        ]).cursor({ batchSize: 1000 }).exec().next().then(values => {
            if (!values) {
                return cb(null, {});
            }

            dataset.aggregate([
                {
                    $sample: { size: 300 }
                },
                {
                    $project: {
                        uri: 1,
                        score: {
                            $divide: [ { $size: { $setIntersection: [ "$words", values.values ] } }, { $size: "$words" } ]
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