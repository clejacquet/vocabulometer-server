
module.exports = {
    checkId: (req, messageFunc) => {
        try {
            return {
                success: true,
                id: req.models.toObjectID(req.params.id)
            }
        } catch (castError) {
            return {
                success: false,
                error: generateError(req, 400, messageFunc(req.param.id))
            };
        }
    },

    generateError: (code, message) => {
        return {
            status: code,
            details: {
                state: 'Error',
                reason: message
            }
        };
    }
};