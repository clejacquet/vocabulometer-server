const onFinished = require('on-finished');

module.exports = (winston) => {
    winston.configure({
        transports: [
            new (winston.transports.File)({ filename: 'error.log', name: 'file.error', level: 'error' }),
            new (winston.transports.File)({ filename: 'combined.log', name: 'file.all'})
        ]
    });

    class InfoOnlyConsole extends winston.transports.Console {
        constructor(options) {
            super(options);
            this.levelOnly = 'info'
        }

        log(level, msg, meta, cb) {
            if (level === this.levelOnly) {
                super.log(level, msg, meta, cb);
            } else {
                cb(null, true);
            }
        }
    }

    //
    // If we're not in production then log to the `console` with the format:
    // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
    //
    if (process.env.NODE_ENV !== 'production') {
        winston.add(InfoOnlyConsole, {
            level: 'info',
            name: 'console.info'
        });
        winston.add(winston.transports.Console, {
            level: 'error',
            name: 'console.error',
            json: true
        });
    }

    return {
        middleware: (req, res, next) => {
            const startAt = process.hrtime();

            const onFinishedFunc = () => {
                const diff = process.hrtime(startAt);
                const diffMs = Math.floor((diff[0] * 1e9 + diff[1]) / 1e6);

                // get the status code if response written
                const status = res._header
                    ? res.statusCode
                    : undefined;

                // get status color
                const color = status >= 500 ? 31 // red
                    : status >= 400 ? 33 // yellow
                        : status >= 300 ? 36 // cyan
                            : status >= 200 ? 32 // green
                                : 0; // no color

                winston.log('info', '%s %s \x1b[' + color + 'm%d \x1b[0m%f ms - %s',
                    req.method,
                    req.originalUrl,
                    status,
                    diffMs,
                    (res.get('Content-Length') === undefined) ? '-' : res.get('Content-Length'));
            };

            onFinished(res, onFinishedFunc);
            next();
        }
    };
};