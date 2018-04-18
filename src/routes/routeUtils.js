
module.exports = {
    checkId: (req, pathScheme, messageFunc) => {
        try {
            return {
                success: true,
                id: req.models.toObjectID(req.params.id)
            }
        } catch (castError) {
            return {
                success: false,
                error: {
                    status: 401,
                    details: {
                        state: 'Error',
                        schema: pathScheme,
                        provided: req.method + ' ' + req.originalUrl,
                        reason: messageFunc(req.param.id)
                    }
                }
            };
        }
    }
};