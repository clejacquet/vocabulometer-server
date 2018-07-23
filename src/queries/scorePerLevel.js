db.getCollection('words_en').aggregate([
{
    "$match": { userId: ObjectId("5ad82e1413935c00044376c2") }
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
        word: {"$arrayElemAt": ["$word.word", 0] },
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
    "$lookup": {
        from: "word_results",
        localField: "word",
        foreignField: "word",
        as: "word"
    }
},
{
    "$project": {
        score: 1,
        level: 1,
        length: { $size: "$word" },
        trueLength: {
            $reduce: {
                input: "$word",
                initialValue: 0,
                in: { $cond: ["$$this.result", { $add: ["$$value", 1 ]}, "$$value"] }
            }
        }
    }
},
{
    "$group": {
        _id: "$level",
        scoreValue: { $sum: "$score" },
        apprentice: { $sum: { $cond: [{ $eq: ["$score", 1] }, 1, 0] }},
        guru: { $sum: { $cond: [{ $eq: ["$score", 2] }, 1, 0] }},
        master: { $sum: { $cond: [{ $eq: ["$score", 5] }, 1, 0] }},
        enlightened: { $sum: { $cond: [{ $eq: ["$score", 10] }, 1, 0] }},
        known: { $sum: { $cond: [{$gte: ["$score", 2]}, 1, 0] }},
        sumRatio: { $sum: { $cond: [{ $eq: ["$length", 0] }, 0, { $divide: ["$trueLength", "$length"] }] }},
        length: { $sum: { $cond: [{ $eq: ["$length", 0] }, 0, 1] } }
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
        ratio: { $cond: [{ $eq: ["$length", 0] }, 0, {$divide: ["$sumRatio", "$length"]}] },
        confidence: { $divide: [ { $ceil: { $multiply: [ { $log: [ { $add: ["$length", 1] }, 2] }, 10] } }, 100 ]}
    }
},
{
    $project: {
        score: 1,
        known: 1,
        ratio: 1,
        confidence: 1,
        prob: { $sum: [ "$ratio", "$known_avg", { $subtract: [0, { "$multiply": [ "$ratio", "$known_avg" ] }] } ] }
    }
},
{
    $project: {
        score: 1,
        known: 1,
        ratio: 1,
        confidence: 1,
        prob: 1,
        prediction: {$ceil: { $multiply: ["$prob", 1000]}}
    }
},
{
    $sort: {
        _id: 1
    }
}
        
])