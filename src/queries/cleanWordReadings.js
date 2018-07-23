db.getCollection('word_readings_en').aggregate([
{
    $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'users'
    }
},
{
    $project: {
        time: 1,
        word: 1,
        userId: 1,
        __v: 1,
        length: { $size: "$users" }
    }
},
{
    $match: {
        length: { $eq: 0 }
    }
},
{
    $project: {
        time: 1,
        word: 1,
        userId: 1,
        __v: 1
    }
},
{
    $out: 'word_readings_en'
}
])