module.exports = (mongoose, models) => {
	return {
		compute: (userId, limit, cb) => {
			if (!limit) {
				limit = 10;
			}

			models.users.aggregate([
				{
					$match: {
						_id: mongoose.Types.ObjectId("59673bdd51e3cc2f885c37f4")
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

				models.userWordScores.saveScores(mongoose.Types.ObjectId("59673bdd51e3cc2f885c37f4"), finalResults,
					(err, result2) => {
						if (err) {
							return cb(err);
						}

						models.texts.aggregate([
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
												stopWords: models.stopWords
											},
											in: {
												$filter: {
													input: "$text.body",
													as: "pair",
													cond: {
														$and: [
															{$eq: ["$$pair.token", "WORD"]},
															{$not: {$in: [{$toLower: "$$pair.value"}, "$$stopWords"]}}
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
									word: {$toLower: "$text.body.value"}
								}
							},
							{
								$group: {
									_id: {_id: "$_id", title: "$title"},
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
												}, "$wordCount"]
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