'use strict';
const semver = require('semver');
const colors = require('colors/safe');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;
const path = require('path');
const { getSemverVersions } = require('@beyond-cli/get-npm-info');
const { Command } = require('commander');
const exec = require('@beyond-cli/exec');
const { spinnerStart } = require('@beyond-cli/utils');
const log = require('@beyond-cli/log');
const { version: currentVersion, name: pkgName, bin } = require('../../../package.json');
const { DEFAULT_CLI_HOME } = require('./const');

// 参数
let program = new Command();


async function core() {
    try {
        await prepareCli();
        registerCommander();
    }catch (e) {
        if (program._optionValues.debug) {
            console.log(e);
        }
        log.error('cli', colors.red(e.message));
    }
}


function registerCommander() {
    // 全局配置
    program
        .name(Object.keys(bin)[0])
        .usage('<command> [options]')
        .version(currentVersion)
        .option('-d, --debug', '开启调试模式', false)
        .option('-tp, --targetPath <targetPath>', '配置缓存目录', '')

    // 注册init命令
    program
        .command('init')
        .description('初始化项目')
        .option('-f, --force', '是否开启强制', false)
        .action(exec)

    // 监听debug
    program.on('option:debug', () => {
        // const { _optionValues: { debug } } = program;
        process.env.LOG_LEVEL = 'verbose';
        log.level = process.env.LOG_LEVEL;
        log.verbose('cli', '已开启调试模式');
    })

    // 监听targetPath
    program.on('option:targetPath', (cmd) => {
        process.env.CLI_TARGET_PATH = cmd;
    })

    // 监听错误命令
    program.on('command:*', function(cmd) {
        log.error('cli', `命令不可用：${cmd[0]}`)
        program.outputHelp();
    })

    program.parse(process.argv);
}

/**
 * 脚手架准备
 */
async function prepareCli() {
    showCLi();
    checkPkgVersion();
    checkRoot();
    checkUserHome();
    checkEnv();
    await checkGlobalNpmPkgVersion();
}

/**
 * 检查package版本
 */
function checkPkgVersion() {
    log.info('version', currentVersion)
}

/**
 * logo
 */
function showCLi() {
    const CFonts = require('cfonts');
    CFonts.say('BEYOND CLI', {
        font: 'tiny',               // define the font face
        align: 'left',              // define text alignment
        colors: ['cyan'],           // define all colors
        background: 'transparent',  // define the background color, you can also use `backgroundColor` here as key
        letterSpacing: 1,           // define letter spacing
        lineHeight: 1,              // define the line height
        space: true,                // define if the output text should have empty lines on top and on the bottom
        maxLength: '0',             // define how many character can be on one line
        gradient: false,            // define your two gradient colors
        independentGradient: false, // define if you want to recalculate the gradient for each new line
        transitionGradient: false,  // define if this is a transition between colors directly
        env: 'node'                 // define the environment CFonts is being executed in
    });
}
/**
 *检查npm版本
 * @return {Promise<void>}
 */
async function checkGlobalNpmPkgVersion() {
    const spinner = spinnerStart('正在检测脚手架版本，请稍候...')
    try {
        const [lastVersion] = await getSemverVersions(currentVersion, 'axios');
        if (lastVersion && semver.gt(lastVersion, currentVersion)) {
            spinner.warn(`更新提示: 脚手架当前版本为: ${colors.green(currentVersion)}  最新版本为: ${colors.red(lastVersion)}  请升级: ${colors.yellow('npm i -g beyond-cli')}`)
        }else {
            spinner.succeed('当前脚手架已经是最新版本！');
        }
    }catch (e) {
        throw e;
    }finally {
        spinner.stop();
    }
}



/**
 * root账号启动检查, 自动降级
 */
function checkRoot() {
    require('root-check')();
}

/**
 * 检查是否有用户主目录
 */
function checkUserHome() {
    if (!userHome || !pathExists(userHome)) {
        throw new Error(colors.red( '用户主目录不存在！'))
    }
}

/**
 * 检查环境变量
 */
function checkEnv() {
    const envPath = path.resolve(userHome, '.env');
    const dotenv = require('dotenv');
    if (pathExists(envPath)) {
        dotenv.config({
            path: envPath
        })
    }
    createDefaultEnvConfig();
}

// 创建默认环境变量配置
function createDefaultEnvConfig() {
    const cliConfig = {
        home: userHome,
    }
    cliConfig['cliHome'] = process.env.CLI_HOME
        ? path.join(userHome, process.env.CLI_HOME)
        : path.join(userHome, DEFAULT_CLI_HOME);
    process.env.CLI_HOME_PATH = cliConfig.cliHome;
}


module.exports = core;
