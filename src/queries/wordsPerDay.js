db.getCollection('users').aggregate([
{
    $match: {
        name: "Roger"
    }
},
{
    $project: {
        words: "$words"
    }
},
{
    $unwind: "$words"
},
{
    $project: {
        "words.word": "$words.word",
        "words.day": {
            $subtract: [
                "$words.time",
                {
                    $add: [
                        { $multiply: [{$hour: '$words.time'}, 3600000]},
                        { $multiply: [{$minute: '$words.time'}, 60000]},
                        { $multiply: [{$second: '$words.time'}, 1000]},
                        { $millisecond: '$words.time'}
                    ]
                }
            ]
        },
    }
},
{
    $group: {
        _id: "$words.day",
        count: { $sum: 1 }
    }
}, 
{
    $sort: {
        _id: 1,
    }
}
])