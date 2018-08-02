module.exports = (userId, limit, languageFormatter) => {
    return [
        {
            $match: { userId: userId }
        },
        {
            $sort: {
                time: -1
            }
        },
        {
            $limit: limit
        },
        {
            $lookup: {
                from: languageFormatter.format("vocabs"),
                localField: "word",
                foreignField: "word",
                as: "info"
            }
        },
        {
            $project: {
                userId: 1,
                word: 1,
                level: { $arrayElemAt: [ '$info.level', 0 ] },
                result: 1,
                time: 1
            }
        },
        {
            $lookup: {
                from: languageFormatter.format("word_status"),
                let: { userId: "$userId", word: '$word' },
                pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$userId', '$$userId']}, { $eq: ['$word', '$$word']}] } } }],
                as: "status"
            }
        },
        {
            $project: {
                word: 1,
                level: 1,
                status: { $cond: [{ $gt: [{ $size: '$status' }, 0] }, { $arrayElemAt: [ '$status.status', 0 ] }, 'Unknown'] },
                result: 1,
                time: 1
            }
        }
    ]
};