const request = require('request');
const async = require('async');

function compute(texts, cb) {
	request({
		uri: 'http://' + (process.env.NLP_ADDRESS || 'nlp') + '/vocabulometer/lemmatize',
		method: 'POST',
		json: {
			texts: texts
		}
	}, (error, response, body) => {
		if (error) {
			return cb(error);
		}

		if (response.statusCode !== 200) {
			return cb('NLP server responded with status code ' + response.statusCode);
		}

		cb(null, body.texts.map(text => text.result.map((paragraph) => {
            return {
                interWords: paragraph.interWords,
                words: paragraph.words
            }
        })));
	});
}

function uniq(a) {
    const seen = {};
    return a.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}

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
			source: String
		}
	});

	textSchema.statics.loadAndCreateTexts = function (texts, cb) {
		const bodies = texts.map(text => text.body);

        compute(bodies, (err, computedBodies) => {
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
                    const words = uniq([]
                        .concat(...text.body.map(p => p.words))
                        .filter(w => w.lemma != null)
                        .map(w => w.lemma));

                    this.create({
                        text: {
                            title: text.title,
                            body: text.body,
                            words: words,
                            source: text.source
                        }
                    }, cb);
				}
			});

            async.parallel(tasks, cb);
        });

	};

	textSchema.statics.loadAndModifyText = function (id, text, cb) {
		compute([text], (err, texts) => {
			if (err) {
				return cb(err);
			}

			const paragraphs = texts[0];

			const body = paragraphs;
            const words = uniq([]
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

