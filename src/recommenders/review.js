const winston = require('winston');

module.exports = (usersModel, userId, dataset, limit, cb) => {
    usersModel.aggregate([
        {
            $match: {
                _id: userId
            }
        },
        {
            $unwind: '$words'
        },
        {
            $sort: {
                "words.time": -1
            }
        },
        {
            $group: {
                _id: '$words.word',
                occurences: {
                    $push: '$words.time'
                },
                count: {$sum: 1}
            }
        },
        {
            $project: {
                intervals: {
                    $reduce: {
                        input: "$occurences",
                        initialValue: {array: [], lastdate: new Date()},
                        in: {
                            array: {$concatArrays: ["$$value.array", [{$divide: [{$subtract: ["$$value.lastdate", "$$this"]}, 3600 * 1000 * 24]}]]},
                            lastdate: "$$this"
                        }
                    }
                }
            }
        },
        {
            $project: {
                score: {
                    $reduce: {
                        input: {$reverseArray: "$intervals.array"},
                        initialValue: 1,
                        in: {
                            $add: [1, {$multiply: ["$$value", {$exp: {$multiply: [-0.05, "$$this"]}}]}]
                        }
                    }
                }
            }
        },
        {
            $sort: {
                score: -1
            }
        },
        {
            $limit: 500
        }
    ], (err, result) => {
        if (err) {
            return cb(err);
        }

        const finalResults = result.map((wordScore) => ({word: wordScore._id, score: wordScore.score}));

        dataset.aggregate([
            {
                $sample: { size: 150 }
            },
            {
                $project: {
                    title: 1,
                    uri: 1,
                    _id: 0,
                    score: {
                        $let: {
                            vars: {word_scores: finalResults},
                            in: {
                                $divide: [{
                                    $reduce: {
                                        input: {
                                            $filter: {
                                                input: "$$word_scores",
                                                cond: {
                                                    $in: ["$$this.word", "$words"]
                                                }
                                            }
                                        },
                                        initialValue: 0,
                                        in: {
                                            $sum: ["$$value", "$$this.score"],
                                        }
                                    }
                                }, {
                                    $size: '$words'
                                }]
                            }
                        }
                    }
                }
            },
            {
                $sort: {
                    score: -1
                }
            },
            {
                $limit: limit
            }
        ], cb);
    });
};