module.exports = (mongoose, models) => {
	return {
		compute: (userId, limit, cb) => {
			if (!limit) {
				limit = 10;
			}

			models.users.aggregate([
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

				winston.log('info', result);

				const finalResults = result.map((wordScore) => ({word: wordScore._id, score: wordScore.score}));

				models.userWordScores.saveScores(mongoose.Types.ObjectId(userId), finalResults,
					(err, result2) => {
						if (err) {
							return cb(err);
						}

						models.texts.aggregate([
							{
								$sample: { size: 100 }
							},
							{
								$project: {
									title: "$text.title",
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
																	$in: ["$$this.word", "$text.words"]
																}
															}
														},
														initialValue: 0,
														in: {
															$sum: ["$$value", "$$this.score"],
														}
													}
												}, {
                                                    $size: '$text.words'
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
						], (err, result3) => {
							cb(err, result3);
						});
					});
			});
		}
	}
};