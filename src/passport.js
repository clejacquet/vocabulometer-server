const passport = require('passport');
const LocalStrategy = require('passport-local');

const authenticate = require('express-jwt')({secret : 'efe5s3fs5f4e5s5c55e5segrgrg2s3'});

const aggregation = (userId) => ([
    {
        $match: {
            _id: userId
        }
    },
    {
        $lookup: {
            from: "word_results_en",
            localField: "_id",
            foreignField: "userId",
            as: "words_en"
        }
    },
    {
        $lookup: {
            from: "word_results_jp",
            localField: "_id",
            foreignField: "userId",
            as: "words_jp"
        }
    },
    {
        $project: {
            name: 1,
            isNewEn: { $eq: [ { $size: "$words_en" }, 0 ] },
            isNewJp: { $eq: [ { $size: "$words_jp" }, 0 ] }
        }
    }
]);

module.exports = (models) => {
	passport.serializeUser(function(user, done) {
		done(null, {
			_id: user._id
		});
	});

	passport.deserializeUser(function(user, done) {
        models.users.aggregate(aggregation(user._id), (err, userArray) => {
            if (err) {
                return done(err);
            }

            if (userArray.length === 0) {
                return done({
                    status: 500,
                    error: 'No user with such ID: ' + req.user._id
                });
            }

            return done(null, userArray[0]);
        });
	});

	passport.use(new LocalStrategy((username, password, done) => {
		models.users.findOne({ name: username }, (err, user) => {
			if (err) { return done(err); }
			if (!user) {
				return models.users.storeUser(username, password, done);
			}
			user.validPassword(password, (err, valid) => {
				if (err) {
					return done(err);
				}
				if (!valid) {
					return done(null, false, { message: 'Incorrect password.' });
				}

				models.users.aggregate(aggregation(user._id), (err, userArray) => {
                    if (err) {
                        return done(err);
                    }
                    if (userArray.length === 0) {
                        return done({
                            status: 500,
                            error: 'No user with such ID: ' + user._id
                        });
                    }

                    return done(null, {
                        _id: userArray[0]._id,
                        name: userArray[0].name,
                        isNewEn: userArray[0].isNewEn,
                        isNewJp: userArray[0].isNewJp
                    });
				});
			});
		});
	}));

	passport.isLoggedIn = (req, res, next) => {
		authenticate(req, res, (err) => {
			if (err) {
				return next(err);
			}

			deserialize(req, res, next);
		});
	};

	return passport;
};

function deserialize(req, res, next) {
    req.models.users.aggregate(aggregation(req.models.toObjectID(req.user.id)), (err, userArray) => {
            if (err) {
                return next(err);
            }

            if (userArray.length === 0) {
                return next({
                    status: 500,
                    error: 'No user with such ID: ' + req.user.id
                });
            }

            req.user = userArray[0];

            next();
        });
}
