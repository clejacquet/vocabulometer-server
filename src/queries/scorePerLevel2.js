db.getCollection('users').aggregate([
{
    $match: { _id: ObjectId("5b3494644b513d59b892de07") }
},
{
    $facet: {
        user: [{ $project: { _id: 1 }}],
        quiz: [
            {
                $lookup: {
                    from: "word_results_en",
                    localField: "_id",
                    foreignField: "userId",
                    as: "word_results"
                }
            },
            {
                $unwind: "$word_results"
            },
            {
                $project: {
                    word: "$word_results.word",
                    result: "$word_results.result",
                }
            },
            {
                $group: {
                    _id: "$word",
                    results: { $push: "$result" }
                }
            },
            {
                $lookup: {
                    from: "vocabs_en",
                    localField: "_id",
                    foreignField: "word",
                    as: "vocabs"
                }
            },
            {
                $project: {
                    length: { $size: "$results" },
                    trueLength: {
                        $reduce: {
                            input: "$results",
                            initialValue: 0,
                            in: { $cond: ["$$this", { $add: ["$$value", 1 ]}, "$$value"] }
                        }
                    },
                    level: { $arrayElemAt: [ "$vocabs.level", 0 ] }
                }
            },
            {
                $project: {
                    ratio: { $divide: ["$trueLength", "$length"] },
                    level: 1
                }
            },
            {
                $group: {
                    _id: "$level",
                    length: { $sum: 1 },
                    sumRatio: { $sum: "$ratio" }
                }
            },
            {
                $project: {
                    length: 1,
                    ratio: { $cond: [{ $eq: ["$length", 0] }, 0, {$divide: ["$sumRatio", "$length"]}] },
                    confidence: { $divide: [ { $ceil: { $multiply: [ { $log: [ { $add: ["$length", 1] }, 2] }, 10] } }, 100 ]}
                }
            },
            {
                $sort: {
                    _id: 1
                }
            }
        ],
        reading: [
            {
                $lookup: {
                    from: "words_en",
                    localField: "_id",
                    foreignField: "userId",
                    as: "word"
                }
            },
            {
                $project: {
                    word: 1
                }
            },
            {
                $unwind: "$word"
            },
            {
                $group: { _id: "$word.word", count: { "$sum": 1 }}
            },
            {
                $lookup: {
                    from: "vocabs_en",
                    localField: "_id",
                    foreignField: "word",
                    as: "word"
                }
            },
            {
                $match: { word: { "$gt": [ "$size", 0 ] }}
            },
            {
                $project: {
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
                $group: {
                    _id: "$level",
                    scoreValue: { $sum: "$score" },
                    apprentice: { $sum: { $cond: [{ $eq: ["$score", 1] }, 1, 0] }},
                    guru: { $sum: { $cond: [{ $eq: ["$score", 2] }, 1, 0] }},
                    master: { $sum: { $cond: [{ $eq: ["$score", 5] }, 1, 0] }},
                    enlightened: { $sum: { $cond: [{ $eq: ["$score", 10] }, 1, 0] }},
                    known: { $sum: { $cond: [{$gte: ["$score", 2]}, 1, 0] }}
                }
            },
            {
                $project: {
                    score: {
                        value: "$scoreValue",
                        apprentice: "$apprentice",
                        guru: "$guru",
                        master: "$master",
                        enlightened: "$enlightened",
                    },
                    known: 1,
                    known_avg: { $divide: [ "$known", 1000 ] },
                }
            },
            {
                $sort: {
                    _id: 1
                }
            }
        ]
    }
},
{
    $project: {
        _id: { $arrayElemAt: ["$user._id", 0]},
        quiz: 1,
        reading: 1
    }
},
])