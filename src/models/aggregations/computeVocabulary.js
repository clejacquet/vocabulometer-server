module.exports = (userId, languageModel) => {
    return [
        {
            "$match": {_id: userId}
        },
        {
            $facet: {
                reading: [
                    {
                        "$lookup": {
                            from: languageModel.format("word_readings"),
                            localField: "_id",
                            foreignField: "userId",
                            as: "words"
                        }
                    },
                    {
                        "$unwind": "$words"
                    },
                    {
                        "$group": {
                            _id: "$words.word",
                            count: { "$sum": 1 }
                        }
                    },
                    {
                        "$match": {
                            count: { $gte: 12 }
                        }
                    },
                    {
                        "$project": {
                            _id: 1
                        }
                    }
                ],
                quiz: [
                    {
                        $lookup: {
                            from: languageModel.format("word_results"),
                            localField: "_id",
                            foreignField: "userId",
                            as: "results"
                        }
                    },
                    {
                        $unwind: "$results"
                    },
                    {
                        $project: {
                            word: "$results.word",
                            result: "$results.result"
                        }
                    },
                    {
                        $lookup: {
                            from: languageModel.format("vocabs"),
                            localField: "word",
                            foreignField: "word",
                            as: "level"
                        }
                    },
                    {
                        $project: {
                            level: { $arrayElemAt: [ "$level.level", 0 ] },
                            result: 1
                        }
                    },
                    {
                        $group: {
                            _id: "$level",
                            results: { $push: "$result" }
                        }
                    },
                    {
                        $project: {
                            sum: {
                                $reduce: {
                                    input: "$results",
                                    initialValue: 0,
                                    in: { $cond: ["$$this", { $add: ["$$value", 1 ]}, "$$value"] }
                                }
                            },
                            length: { $size: "$results" }
                        }
                    },
                    {
                        $project: {
                            ratio: { $divide: ["$sum", "$length"] }
                        }
                    },
                    {
                        $match: {
                            ratio: { $gte: 0.66 }
                        }
                    },
                    {
                        $lookup:
                            {
                                from: languageModel.format("vocabs"),
                                localField: "_id",
                                foreignField: "level",
                                as: "words"
                            }
                    },
                    {
                        $group: {
                            _id: null,
                            words: {
                                $push: "$words"
                            }
                        }
                    },
                    {
                        $project: {
                            words: {
                                $reduce: {
                                    input: "$words",
                                    initialValue: [],
                                    in: {
                                        $concatArrays: ["$$this", "$$value"]
                                    }
                                }
                            }
                        }
                    },
                    {
                        $unwind: "$words"
                    },
                    {
                        $project: {
                            word: "$words.word",
                            first: { $substrCP: [ "$words.word", 0, 1 ] }
                        }
                    },
                    {
                        $match: {
                            first: {
                                $ne: "<"
                            }
                        }
                    },
                    {
                        $project: {
                            _id: "$word"
                        }
                    }
                ]
            }
        },
        {
            $project: {
                vocab: {
                    $setUnion: [
                        "$reading._id",
                        "$quiz._id"
                    ]
                }
            }
        }
    ]
};