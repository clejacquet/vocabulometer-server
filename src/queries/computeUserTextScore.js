db.texts.aggregate([
    {
        $sample: { size: 100 }
    },
    {
        $unwind: "$text.body"
    },
    {
        $project: {
            "title": "$text.title",
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
        $project: {
            title: "$title",
            word: { $toLower: "$text.body.value" }
        }
    },
    {
        $group: {
            _id: { _id: "$_id", title: "$title" },
            words: {
                $push: "$word"
            },
            wordCount: {
                $sum: 1
            }
        }
    },
    {
        $project: {
            _id: "$_id._id",
            title: "$_id.title",
            score: { 
                $let: {
                    vars: { word_scores: db.getCollection('user_word_scores').findOne({ userId: ObjectId("59673bdd51e3cc2f885c37f4") }).scores },
                    in: {
                        $divide: [{
                            $reduce: {
                                input: {
                                    $filter: { 
                                        input: "$$word_scores",
                                        cond: {
                                            $in: [ "$$this.word", "$words" ]
                                        }
                                    }
                                },
                                initialValue: 0,
                                in: {
                                    $sum: [ "$$value", "$$this.score" ], 
                                }
                            }
                        }, "$wordCount" ]
                    }
                }
            }
        }
    },
    {
        $sort: {
            score: -1
        }
    }
])