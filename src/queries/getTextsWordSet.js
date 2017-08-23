db.texts.aggregate([
    {
        $unwind: "$text.body"
    },
    {
        $project: {
            "text.body": {
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
        $unwind: "$text.body"
    },
    {
        $group: {
            _id: "$_id",
            words: { $addToSet: { $toLower: "$text.body.value" } }
        }
    },
    {
        $project: {
            score: {
                $let: {
                    vars: {
                        userWords: db.users.aggregate([
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
    }
])