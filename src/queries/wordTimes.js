db.getCollection('users').aggregate([
{
    $match: {
        _id: ObjectId("59673bdd51e3cc2f885c37f4")
    }    
},
{
    $unwind: "$words"
},
{
    $project: {
        word: {
            value: "$words.word",
            time: "$words.time"
        }
    }
},
{
    $sort: {
        "word.time": -1
    }
},
{
    $group: {
        _id: "$word.value",
        times: {
            $push: "$word.time"
        },
        size: {
            $sum: 1
        }
    }
},
{
    $sort: {
        size: -1
    }
}
])