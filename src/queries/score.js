db.getCollection('users').aggregate([
{
    $match: {
        _id: ObjectId("59673bdd51e3cc2f885c37f4")
    }
}, 
{
    $unwind: '$words'
},
{
    $sort: {
        "words.time": -1
    }
},
{
    $group: {
        _id: '$words.word',
        occurences: {
            $push: '$words.time'
        },
        count: { $sum: 1 }
    }
},
{
    $project: {
        intervals: {
            $reduce: {
                input: "$occurences",
                initialValue: { array: [], lastdate: new Date() },
                in: {
                    array: { $concatArrays: [ "$$value.array", [{$divide: [{ $subtract: [ "$$value.lastdate", "$$this" ] }, 3600 * 1000 * 24 ] }]] },
                    lastdate: "$$this"
                }
            }
        }
    }
},
{
    $project: {
        value: {
            $reduce: {
                input: { $reverseArray: "$intervals.array" },
                initialValue: 1,
                in: {
                    $add: [ 1, { $multiply: [ "$$value", { $exp: { $multiply : [ -0.1, "$$this" ] } } ] } ]
                }
            }
        }
    }
},
{
    $sort: {
        value: -1
    }
},
{
    $limit: 1000
}
]);