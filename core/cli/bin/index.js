#! /usr/bin/env node

const importLocal = require('import-local');

if (importLocal(__filename)) {
    require('npmlog').info('beyond-cli', 'import local package')
}else {
    require('../lib')(process.argv.slice(2))
}
