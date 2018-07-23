module.exports = (userId, languageFormatter, count) => {
    return [
        {
            $match: {
                _id: userId
            }
        },
        {
            $lookup: {
                from: languageFormatter.format("word_readings"),
                localField: "_id",
                foreignField: "userId",
                as: "words"
            }
        },
        {
            $unwind: "$words"
        },
        {
            $group: {
                _id: "$words.word",
                count: { $sum: 1 },
                time: {
                    $min: "$words.time"
                }
            }
        },
        {
            $project: {
                time: 1,
                status: {
                    $switch: {
                        branches: [
                            { case: { $gte: [ "$count", 50 ] }, then: 'Enlightened' },
                            { case: { $gte: [ "$count", 25 ] }, then: 'Master' },
                            { case: { $gte: [ "$count", 12 ] }, then: 'Guru' },
                            { case: { $gte: [ "$count", 1 ] }, then: 'Apprentice' }
                        ],
                        default: ''
                    }
                }
            }
        },
        {
            $lookup: {
                from: languageFormatter.format("vocabs"),
                localField: "_id",
                foreignField: "word",
                as: "ref"
            }
        },
        {
            $project: {
                level: { $arrayElemAt: [ '$ref.level', 0 ] },
                status: 1,
                time: 1
            }
        },
        {
            $sort: {
                time: -1
            }
        },
        {
            $limit: count
        }
    ]
};