module.exports = (userId) => {
    return [
        {
            "$match": { userId: userId }
        },
        {
            "$group": { _id: "$word", count: { "$sum": 1 }}
        },
        {
            "$lookup": {
                from: "vocabs",
                localField: "_id",
                foreignField: "word",
                as: "word"
            }
        },
        {
            $match: { word: { "$gt": [ "$size", 0 ] }}
        },
        {
            "$project": {
                level: {"$arrayElemAt": ["$word.level", 0] },
                score: {
                    $switch: {
                        branches: [
                            { case: { $gte: [ "$count", 50 ] }, then: 10 },
                            { case: { $gte: [ "$count", 25 ] }, then: 5 },
                            { case: { $gte: [ "$count", 12 ] }, then: 2 },
                            { case: { $gte: [ "$count", 1 ] }, then: 1 }
                        ]
                    }
                }
            }
        },
        {
            "$group": {
                _id: "$level",
                score: { $sum: "$score" }
            }
        },
        {
            "$sort": {
                _id: 1
            }
        }
    ]
};