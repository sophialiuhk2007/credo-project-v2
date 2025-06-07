"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return Promise.resolve(res.status(401).json({
            error: "User must sign in",
        }));
    }
    next();
    return Promise.resolve();
};
exports.default = {
    isLoggedIn,
};
