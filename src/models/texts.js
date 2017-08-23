const Lexer = require('lex');

module.exports = (mongoose, models) => {
	const textSchema = new mongoose.Schema({
		id: Number,
		text: {
			title: String,
			body: [mongoose.Schema.Types.Mixed]
		}
	});

	textSchema.statics.loadText = function (text, cb) {
		const lexer = new Lexer((char) => {
			cb(new Error('Error while analyzing \'' + char + '\''));
		});

		let quotationZone = false;

		lexer
			.addRule(/[0-9]+([.,][0-9]+)?\s*[°'%]?/, lexeme => { return { token: 'NUMBER', value: lexeme } })
			.addRule(/[a-zA-ZÀ-ÿ'-²³]+('[st])?/, lexeme => { return { token: 'WORD', value: lexeme } })
			.addRule(/\.\.\./, lexeme => { return { token: 'TRIPLE POINT', value: lexeme } })
			.addRule(/\./, lexeme => { return  { token: 'POINT', value: lexeme } })
			.addRule(/,/, lexeme => { return  { token: 'COMMA', value: lexeme } })
			.addRule(/'/, lexeme => { return  { token: 'APOSTROPHE', value: lexeme } })
			.addRule(/"/, lexeme => {
				const val = { token: ((quotationZone) ? 'OPEN' : 'CLOSE') + ' QUOTATION', value: lexeme };
				quotationZone = !quotationZone;
				return val;
			})
			.addRule(/:/, lexeme => { return  { token: 'COLON', value: lexeme } })
			.addRule(/;/, lexeme => { return  { token: 'SEMI-COLON', value: lexeme } })
			.addRule(/\?/, lexeme => { return  { token: 'QUESTION', value: lexeme } })
			.addRule(/!/, lexeme => { return  { token: 'EXCLAMATION', value: lexeme } })
			.addRule(/-/, lexeme => { return  { token: 'DASH', value: lexeme } })
			.addRule(/\(/, lexeme => { return  { token: 'OPEN PARENTHESE', value: lexeme } })
			.addRule(/\)/, lexeme => { return { token: 'CLOSE PARENTHESE', value: lexeme } })
			.addRule(/\[/, lexeme => { return { token: 'OPEN BRACKET', value: lexeme } })
			.addRule(/]/, lexeme => { return { token: 'CLOSE BRACKET', value: lexeme } })
			.addRule(/\n/, lexeme => { return { token: 'RETURN', value: lexeme } })
			.addRule(/\s/, lexeme => { return { token: 'SPACE', value: lexeme } })
			.addRule(/./, lexeme => { return { token: 'UNDEFINED', value: lexeme } });

		lexer.setInput(text);

		let results = [];

		let result;
		while (result = lexer.lex()) {
			results.push(result);
		}

		results = results
			.filter(token => !(token.token === 'SPACE' || token.token === 'UNDEFINED'))
			.reduce((acc, token) => {
				try {
					if (token.token === 'RETURN') {
						acc.push([]);
					} else {
						acc[acc.length - 1].push(token);
					}
				} catch (err) {
					console.error(err);
				}

				return acc;
			}, [[]])
			.filter(paragraph => paragraph.length > 0);

		cb(null, results);
	};

	textSchema.statics.loadAndCreateText = function (title, text, cb) {
		this.loadText(text, (err, results) => {
			if (err) {
				return cb(err);
			}

			this.create({
				text: {
					title: title,
					body: results
				}
			}, (err, result) => {
				if (err) {
					return cb(err);
				}

				cb(null, result.text.body);
			});
		})
	};

	textSchema.statics.loadAndModifyText = function (id, text, cb) {
		this.loadText(text, (err, results) => {
			if (err) {
				return cb(err);
			}

			this.findOneAndUpdate({ _id: id }, { $set: { 'text.body': results }}, (err, result) => {
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

