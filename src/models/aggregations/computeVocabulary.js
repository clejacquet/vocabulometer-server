module.exports = (userId) => {
    return [
        {
            "$match": {_id: userId}
        },
        {
            "$unwind": { path: "$levels", preserveNullAndEmptyArrays: true }
        },
        {
            "$match": { "$or": [ { "levels": { "$exists": false }}, { "levels.ratio": {"$gte": 0.66}} ] }
        },
        {
            "$group": {_id: "$_id", levels: {"$push": "$levels"}}
        },
        {
            "$lookup": {
                from: "words_en",
                localField: "_id",
                foreignField: "userId",
                as: "words"
            }
        },
        {
            "$unwind": { path: "$words", preserveNullAndEmptyArrays: true }
        },
        {
            "$group": {
                _id: {word: "$words.word", userId: "$_id", levels: "$levels" },
                count: { "$sum": 1 }
            }
        },
        {
            "$match": {
                "$or": [ { "_id.word": { "$exists": false }}, { count: { "$gte": 12 }} ]
            }
        },
        {
            "$group": {
                _id: "$_id.userId",
                levels: { "$first": "$_id.levels" },
                words: { "$push": "$_id.word" }
            }
        },
        {
            "$lookup": {
                from: "vocabs",
                localField: "levels.level",
                foreignField: "level",
                as: "levelVocab"
            }
        },
        {
            "$lookup": {
                from: "vocabs",
                localField: "words",
                foreignField: "word",
                as: "readVocab"
            }
        },
        {
            "$project": {
                vocab: {"$setUnion": ["$levelVocab", "$readVocab"]},
            }
        },
        {
            "$project": {
                vocab: {
                    word: 1,
                    level: 1
                }
            }
        }
    ]
};