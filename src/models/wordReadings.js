module.exports = (mongoose, models) => {
    const results = {};

    Object.keys(models.languages).forEach(name => {
        const formatter = models.languages[name];

        const wordSchema = new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
            word: String,
            time: { type: Date, default: Date.now }
        }, {collection: formatter.format('word_readings')});

        const model = mongoose.model(formatter.format('Words'), wordSchema);

        model.addReadWords = (words, userId, cb) => {
            model.create(words.map(word => ({
                userId: userId,
                word: word
            })), (err, result) => {
                if (err) {
                    return cb(err);
                }

                return cb(undefined, result);
            })
        };

        model.scores = (userId, cb) => {
            model.aggregate([
                {
                    $match: {
                        userId: userId
                    }
                },
                {
                    $sort: {
                        "time": -1
                    }
                },
                {
                    $group: {
                        _id: '$word',
                        occurences: {
                            $push: '$time'
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
                }
            ], cb);
        };

        // return cachify(model, [
        //     {
        //         prefix: 'user_en',
        //         funcName: 'scores',
        //         idName: 'userId',
        //         invalidatedBy: [{
        //             model: userModel,
        //             funcName: 'addWords'
        //         }]
        //     }
        // ]);

        results[name] = model;
    });

    return results;
};