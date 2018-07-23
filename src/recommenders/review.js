const winston = require('winston');


module.exports = (userId, usersModel, dataset, language, limit, cb) => {
    usersModel.wordsReading[language].scores(userId, (err, result) => {
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