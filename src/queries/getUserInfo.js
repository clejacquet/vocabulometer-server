db.getCollection('users').aggregate([
{
    $match: {
        _id: ObjectId("5b3074613e168e3b98242796")
    }
},
{
    $lookup: {
        from: "word_results",
        localField: "_id",
        foreignField: "userId",
        as: "words"
    }
},
{
    $project: {
        name: 1,
        isNew: { $eq: [ { $size: "$words" }, 0 ]}
    }
}
])