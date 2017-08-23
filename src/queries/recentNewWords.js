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
    $limit: 10
}
])