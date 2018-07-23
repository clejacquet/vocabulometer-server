module.exports = (userId, languageFormatter, count) => {
    return [
        {
            $match: {
                _id: userId
            }
        },
        {
            "$lookup": {
                from: languageFormatter.format("word_readings"),
                localField: "_id",
                foreignField: "userId",
                as: "words"
            }
        },
        {
            $unwind: "$words"
        },
        {
            $group: {
                _id: "$words.word",
                time: {
                    $min: "$words.time"
                }
            }
        },
        {
            $project: {
                "day": {
                    $subtract: [
                        "$time",
                        {
                            $add: [
                                { $multiply: [{$hour: '$time'}, 3600000]},
                                { $multiply: [{$minute: '$time'}, 60000]},
                                { $multiply: [{$second: '$time'}, 1000]},
                                { $millisecond: '$time'}
                            ]
                        }
                    ]
                },
            }
        },
        {
            $group: {
                _id: "$day",
                count: { $sum: 1 }
            }
        }, {
            $sort: {
                _id: -1
            }
        }, {
            $limit: count
        }
    ]
};