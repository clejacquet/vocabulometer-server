module.exports = (userId, count) => {
    return [
        {
            $match: {
                _id: userId
            }
        },
        {
            "$lookup": {
                from: "words_en",
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
            $sort: {
                time: -1
            }
        }, {
            $limit: count
        }
    ]
};