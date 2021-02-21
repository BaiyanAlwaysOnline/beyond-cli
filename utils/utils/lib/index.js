'use strict';
const ora = require('ora');

function isObject(target) {
    return Object.prototype.toString.call(target) === '[object Object]'
}

function spinnerStart(title) {
    const spinner = ora(title + '\n').start();
    spinner.color = 'yellow';
    return spinner;
}

function sleep(ms = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms))
}


// 兼容windows操作系统
function execCmd(command, args, options) {
    const win32 = process.platform === 'win32';
    args = win32 ? ['/c'].concat(command, args) : args;
    command = win32 ? 'cmd' : command;
    return require('child_process').spawn(command, args, options || {});
}

function execCmdAsync(command, args, options) {
    return new Promise((resolve, reject) => {
        const win32 = process.platform === 'win32';
        args = win32 ? ['/c'].concat(command, args) : args;
        command = win32 ? 'cmd' : command;
        const child = require('child_process').spawn(command, args, options || {});
        child.on('error', err => {
            reject(err);
        });
        child.on('exit', res => {
            resolve(res);
        });
    })
}

module.exports = {
    isObject,
    spinnerStart,
    sleep,
    execCmd,
    execCmdAsync,
};
