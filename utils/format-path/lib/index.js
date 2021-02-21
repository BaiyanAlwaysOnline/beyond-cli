'use strict';
const path = require('path');

module.exports = function (p) {
    if (p && typeof p === "string") {
        if (path.sep !== '/') {
            p = p.replace(/\\/g, '/')
        }
        return p;
    }
};
