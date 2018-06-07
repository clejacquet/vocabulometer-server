const async = require('async');
const _ = require('underscore');


module.exports = (mongoose, models) => {
	const paragraphWordSchema = new mongoose.Schema({
        raw: String,
        lemma: String
	}, { _id: false });

	const paragraphSchema = new mongoose.Schema({
        interWords: [String],
        words: [paragraphWordSchema]
	},{ _id : false });

	const textSchema = new mongoose.Schema({
		text: {
			title: String,
			body: [paragraphSchema],
			words: [String],
            unrecognized: [String],
            unrecognizedRate: Number,
			source: String
		}
	});

	textSchema.statics.loadAndCreateTexts = function (texts, cb) {
		const bodies = texts.map(text => text.body);

        models.nlp.compute(bodies, (err, computedBodies) => {
            if (err) {
                return cb(err);
            }

            const computedTexts = computedBodies.map((paragraphs, i) => {
            	return {
            		body: paragraphs,
					title: texts[i].title,
					source: texts[i].source
				}
			});

            const tasks = computedTexts.map((text) => {
            	return cb => {
                    const words = _.uniq([]
                        .concat(...text.body.map(p => p.words))
                        .filter(w => w.lemma != null)
                        .map(w => w.lemma));

                    const unrecognized = _.uniq([]
                        .concat(...text.body.map(p => p.unrecognized)));

                    const unrecognizedRate = text.body
						.map(p => p.unrecognizedRate)
						.reduce((acc, cur) => acc + cur / text.body.length, 0);

                    text.body = text.body.map(p => ({
                        words: p.words,
						interWords: p.interWords
					}));

                    this.create({
                        text: {
                            title: text.title,
                            body: text.body,
                            words: words,
							unrecognized: unrecognized,
                            unrecognizedRate: unrecognizedRate,
                            source: text.source
                        }
                    }, cb);
				}
			});

            async.parallel(tasks, cb);
        });

	};

	textSchema.statics.loadAndModifyText = function (id, text, cb) {
		models.nlp.compute([text], (err, texts) => {
			if (err) {
				return cb(err);
			}

			const paragraphs = texts[0];

			const body = paragraphs;
            const words = _.uniq([]
                .concat(...paragraphs.map(p => p.words))
                .filter(w => w.lemma != null)
                .map(w => w.lemma));

			this.findOneAndUpdate({ _id: id }, { $set: { 'text.body': body, 'text.words': words }}, (err, result) => {
				if (err) {
					return cb(err);
				}

				cb(null, {
					status: 'success'
				});
			});
		})
	};

	textSchema.statics.modifyTitle = function (id, title, cb) {
		this.findOneAndUpdate({ _id: id }, { $set: { 'text.title': title }}, (err, result) => {
			if (err) {
				return cb(err);
			}

			cb(null, {
				status: 'success'
			});
		});
	};

	textSchema.statics.getSample = function (cb) {
		this.aggregate([
			{
				$sample: { size: 1 }
			}
		], (err, result) => {
			if (err) {
				return cb(err);
			}

			if (result.length > 0) {
				cb(null, result[0]._id);
			} else {
				cb();
			}
		});
	};

	return mongoose.model('Text', textSchema);
};

