const natural = require('natural');

const wordTokenizer = new natural.WordTokenizer();

function splitParagraphs(text) {
	return text
        .split('\n')
        .filter((paragraph) => paragraph.length > 0);
}

function compute(data) {
	const paragraphs = splitParagraphs(data);

	return paragraphs.map((paragraph) => {
		const words = wordTokenizer.tokenize(paragraph);
		const nonStopWords = words
			.filter((word) => !natural.stopwords.includes(word));

		return {
			'raw': paragraph,
			'allWords': words,
			'nonStopWords': nonStopWords
		}
	})
}

function uniq(a) {
    const seen = {};
    return a.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}

module.exports = (mongoose, models) => {
	const textSchema = new mongoose.Schema({
		id: Number,
		text: {
			title: String,
			body: String,
			words: [String],
			source: String
		}
	});

	textSchema.statics.loadText = function (text, cb) {
		cb(null, compute(text));
	};

	textSchema.statics.loadAndCreateText = function (title, text, cb) {
        const words = uniq(wordTokenizer
			.tokenize(text)
			.filter((word) => !natural.stopwords.includes(word))
            .map((word) => word.toLowerCase()));

		this.create({
			text: {
				title: title,
				body: text,
				words: words,
				source: 'BBC'
			}
		}, (err, result) => {
			if (err) {
				return cb(err);
			}

			console.log(result);

			cb(null, compute(result.text.body));
		});
	};

	textSchema.statics.loadAndModifyText = function (id, text, cb) {
		this.loadText(text, (err, results) => {
			if (err) {
				return cb(err);
			}

			const body = results.map((paragraph) => paragraph.raw).join('\n');
			const words = uniq([].concat.apply([], results.map((paragraph) => paragraph.nonStopWords)));

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

