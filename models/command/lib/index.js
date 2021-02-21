'use strict';
const semver = require('semver');
const log = require('@beyond-cli/log');

const { LOWEST_NODEVERSION } = require('./const');

class Command {
    constructor(argv) {
        if (!argv) {
            throw new Error('Command: argv参数必传！');
        }
        if (!Array.isArray(argv)) {
            throw new Error('Command: argv参数必须为数组！');
        }
        if (argv.length < 1) {
            throw new Error('Command: argv参数列表不能为空！');
        }
        this._argv = argv;
        let runner = new Promise(((resolve, reject) => {
            let chain = Promise.resolve();
            chain = chain.then(() => this.checkNodeVersion());
            chain = chain.then(() => this.initArgs());
            chain = chain.then(() => this.init());
            chain = chain.then(() => this.exec());
            chain.catch(err => log.error(err.message))
        }))
    }

    /**
     * 检查node版本
     */
    checkNodeVersion() {
        const currentNodeVersion = process.version;
        if (!semver.gte(currentNodeVersion, LOWEST_NODEVERSION)) {
            throw new Error('beyond-cli node版本不能低于：' + LOWEST_NODEVERSION);
        }
    }

    initArgs() {
        const [ projectName, options, cmdObj ] = this._argv;
        this['_cmd'] = cmdObj;
        this['projectName'] = projectName;
        this["options"] = options;
    }

    init() {
        throw new Error('Command: init函数必须实现！');
    }

    exec() {
        throw new Error('Command: exec函数必须实现！');
    }
}

module.exports = Command;

