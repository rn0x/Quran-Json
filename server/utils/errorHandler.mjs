// utils/errorHandler.js
import { handleError } from './errorUtils.mjs';

export default (err, req, res, next) => {
    handleError(res, 500, 'Server Error.', {
        message: '🚨 An unexpected error occurred. Please try again later.',
        details: '🔍 If the problem persists, contact support for assistance.\n⤷ https://github.com/msr7799',
        stack: err.stack,
    });
};
