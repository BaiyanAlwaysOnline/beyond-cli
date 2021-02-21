'use strict';
const log = require('npmlog');
const LEVEL = process.env.LOG_LEVEL;

// 根据环境比变量设置level等级
log.level = LEVEL ? LEVEL : 'info';
// 增加log前缀
log.heading = 'beyond';
// log.headingStyle = { fg: 'blue', bg: 'white' };
// 自定义log输出
log.addLevel('success', 2000, { fg: 'green', bold: true })




module.exports = log;
