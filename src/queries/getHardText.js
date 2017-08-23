
db.texts.aggregate([
{
    $unwind: "$text.body"
},
{
    $project: {
        "title": "$text.title",
        "body": {
            $let: {
                vars: {
                    stopWords: db.stopwords.findOne({}).stopwords
                },
                in: {
                    $filter: {
                        input: "$text.body",
                        as: "pair",
                        cond: {
                            $and: [
                                { $eq: [ "$$pair.token", "WORD" ] },
                                { $not: { $in: [ { $toLower: "$$pair.value" },  "$$stopWords"] } }
                            ]
                        }
                    }
                }
            }
        }
    }
},
{
    $unwind: "$body"
},
{
    $group: {
        _id: { _id: "$_id", title: "$title" },
        words: { $addToSet: { $toLower: "$body.value" } }
    }
},
{
    $project: {
        _id: "$_id._id",
        title: "$_id.title",
        score: {
            $let: {
                vars: {
                    userWords: db.users.aggregate([
                        {
                            $match: {
                                _id: ObjectId("5947ee5fdc63dabbe8bbe083")
                            }
                        },
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
                },
                in: { $divide: [ { $size: { $setIntersection: [ "$words", "$$userWords" ] } }, { $size: { $setUnion: [ "$words", "$$userWords" ] } } ] }
            }
        }
    }
},
{
    $sort: {
        score: -1
    }
}])