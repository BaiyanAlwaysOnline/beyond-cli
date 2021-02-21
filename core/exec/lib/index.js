'use strict';
const path = require('path');
const pathExists = require('path-exists').sync;
const { CACHE_DIR } = require('./const');
const Package = require('@beyond-cli/package');
const log = require('@beyond-cli/log');
const { spinnerStart, execCmd: spawn } = require('@beyond-cli/utils');

const SETTINGS = {
    // todo publish后修改
    'init': '@beyond-cli/init',
}

async function exec() {
    const program = arguments[arguments.length - 1];
    const cmdName = program.name();
    const homePath = process.env.CLI_HOME_PATH;
    let targetPath = process.env.CLI_TARGET_PATH, options, pkg;

    if (!targetPath) {
        targetPath = path.resolve(homePath, CACHE_DIR);
        const storePath = path.resolve(targetPath, 'node_modules')
        options = {
            targetPath,
            storePath,
            packageName: SETTINGS[cmdName],
            packageVersion: 'latest'
        }
        pkg = new Package(options);
        try {
            if (await pkg.exists()) {
                await pkg.updatePackage();
            }else {
                await pkg.installPackage();
            }
        }catch (e) {
            log.error('初始化脚手架失败！', e.message);
        }
    }else if(pathExists(targetPath)) {
        options = {
            targetPath,
            packageName: SETTINGS[cmdName],
            packageVersion: 'latest'
        }
        pkg = new Package(options);
    }else {
        return log.error(targetPath + ' is not exists')
    }

    const rootFilePath = pkg.getRootFilePath();
    if (rootFilePath) {
        const args = Array.from(arguments);
        const cmdObj =args[args.length - 1];
        const o = Object.create(null);
        Object.keys(cmdObj).forEach(cmd => {
            if (
                !cmd.startsWith('_')
                && cmd !=='parent'
                && cmdObj.hasOwnProperty(cmd)
            ) {
                o[cmd] = cmdObj[cmd];
            }
        })
        args[args.length - 1] = o;
        try{
            const code = `require('${rootFilePath}').call(null, ${JSON.stringify(args)})`;
            const child = spawn('node', ['-e', code], {
                cwd: process.cwd(),
                stdio: 'inherit',
            });

            child.on('error', err => {
                log.error(err.message);
                process.exit(1);
            });

            child.on('exit', res => {
                log.verbose(`Code ${res}`);
                res && process.exit(res);
            });
        }catch (e) {
            log.error(e.message);
        }
    }
}


module.exports = exec;

