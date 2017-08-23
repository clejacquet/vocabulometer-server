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
    $group: {
        _id: '$words.word',
        occurences: {
            $push: '$words.time'
        },
        count: { $sum: 1 }
    }
},
{
    $sort: {
        count: -1
    }
}
]);