db.users.aggregate([
    {
        $unwind: '$words'
    },
    {
        $group: {
            _id: '$words.word',
            count: { $sum: 1 },
            last_time: {
                $max: '$words.time'
            }
        }
    },
    {
        $sort: {
            count: -1
        }
    }
]).toArray().map(function (e) {
    return e._id;
})