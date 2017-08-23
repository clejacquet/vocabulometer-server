db.words_set.update({
    _id: ObjectId("5947fa756886d00815a6dc35")
}, {
    $addToSet: {
        words: {
            word: 'test',
            time: Date()
        }
    }
});