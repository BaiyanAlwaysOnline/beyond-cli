'use strict';
const fs = require('fs');
const fse = require('fs-extra');
const path = require("path");
const inquirer = require('inquirer');
const semver = require('semver');
const userHome = require('user-home');
const colors = require('colors');
const ejs = require('ejs');
const glob = require('glob');
const Command = require('@beyond-cli/command');
const { spinnerStart, execCmdAsync, sleep } = require('@beyond-cli/utils');
const log = require('@beyond-cli/log');
const Package = require('@beyond-cli/package');
const request = require('@beyond-cli/request');
const {
    TYPE_PROJECT,
    TYPE_COMPONENT,
    TEMPLATE_TYPE_NORMAL,
    TEMPLATE_TYPE_CUSTOM,
    SAFE_COMMAND,
} = require('./const');
const { regProjectName } = require('./common');


class InitCommand extends Command {
    init() {
        this.force = this.options.force;
        log.verbose('force', this.options.force)
        log.verbose('projectName', this.projectName);
    }

    async exec() {
        try {
            const isContinue = await this.prepare();
            if (isContinue) {
                await this.queryTemplate();
                this.projectInfo = await this.getProjectInfo();
                await this.downloadTemplate();
                await this.installTemplate();
            }
        }catch (e) {
            log.error(e.message)
        }
    }

    async prepare() {
        const localPath = process.cwd();
        // 1. 判断当前目录是否为空？
        if (!this.isDirEmpty(localPath)) {
            // 1.1 询问是否继续创建
            let isContinue;
            // 2. 是否强制启动更新
            if (this.force) {
                // 开启强制模式，不再询问，直接执行下一步操作
                isContinue = true;
            }else {
                const r = await inquirer.prompt({
                    name: 'isContinue',
                    type: 'confirm',
                    default: false,
                    message: '当前目录不为空，是否继续创建？'
                })
                isContinue = r['isContinue']
            }

            if (isContinue) {
                // 询问是否清空当前文件夹
                const { isEmpty } = await inquirer.prompt({
                    name: 'isEmpty',
                    type: 'confirm',
                    default: false,
                    message: '当前目录不为空，是否清空当前目录？'
                });
                if (isEmpty) {
                    const spinner = spinnerStart('正在清空当前目录...');
                    fse.emptyDirSync(localPath);
                    spinner.succeed('已清空当前目录')
                }
            }else {
             return false;
            }
        }

        return true;
    }

    async getProjectInfo() {
        const projectInfo = {};
        // 3. 选择创建项目或组件
        const { type } = await inquirer.prompt({
            name: 'type',
            type: 'list',
            default: '',
            message: '请选择初始化类型：',
            choices: [{
                name: '组件',
                value: TYPE_COMPONENT
            },{
                name: '项目',
                value: TYPE_PROJECT
            }]
        });
        // 过滤template信息
        this.template = this.template.filter(({tag = []}) => tag.includes(type));
        const title = type === TYPE_COMPONENT ? '组件' : '项目'
        const projectPrompt = [{
            name: 'projectVersion',
            type: 'input',
            message: `请输入${title}版本号`,
            default: '1.0.0',
            validate: function (v){
                const done = this.async();
                setTimeout(() => {
                    if (!(!!semver.valid(v))) {
                        return done('请输入合法的版本号！')
                    }
                    done(null, true);
                }, 0);
                return !!semver.valid(v);
            },
            filter: (v) => {
                if (!!semver.valid(v)) {
                    return semver.valid(v);
                }
                return v;
            }
        },{
            name: 'template',
            type: 'list',
            default: '',
            message: `请选择${title}模板：`,
            choices: this.getTemplateChoices(),
        }];

        if (this.projectName && regProjectName.test(this.projectName)) {
            projectInfo.projectName = this.projectName;
        }else {
            projectPrompt.unshift({
                name: 'projectName',
                type: 'input',
                message: `请输入${title}名称`,
                default: '',
                validate: function (v) {
                    const done = this.async();
                    setTimeout(() => {
                        if (!regProjectName.test(v)) {
                            return done(`请输入合法的${title}名称！`)
                        }
                        done(null, true);
                    }, 0);
                    return regProjectName.test(v);
                },
                filter: (v) => {
                    return v;
                }
            })
        }
        // 4. 获取项目的基本信息
        switch (type) {
            case TYPE_COMPONENT:
                projectPrompt.push({
                    name: 'componentDescription',
                    type: 'input',
                    message: `请输入组件描述信息`,
                    default: '',
                    validate: function (v) {
                        const done = this.async();
                        setTimeout(() => {
                            if (!v) {
                                return done(`组件描述信息不能为空！`)
                            }
                            done(null, true);
                        }, 0);
                        return regProjectName.test(v);
                    }
                })
                const component = await inquirer.prompt(projectPrompt);
                Object.assign(projectInfo, component);
                break;
            case TYPE_PROJECT:
                const project = await inquirer.prompt(projectPrompt);
                Object.assign(projectInfo, project);
                break;
        }
        // 生成classname
        if (projectInfo.projectName) {
            // projectInfo.name = projectInfo.projectName;
            projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, '');
        }
        if (projectInfo.projectVersion) {
            projectInfo.version = projectInfo.projectVersion;
        }
        if (projectInfo.componentDescription) {
            projectInfo.description = projectInfo.componentDescription;
        }
        return projectInfo;
    };

    async queryTemplate() {
        // 查询模板信息
        this.template = await request({
            url: '/project/getTemplate'
        });
    }

    getTemplateChoices() {
        return this.template.map(({ packageName, packageValue }) => {
            return {
                name: packageName,
                value: packageValue
            }
        });
    };

    async downloadTemplate() {
        const { projectInfo: { template } } = this;
        const templateInfo = this.template.find(({ packageValue }) => template === packageValue);
        this.templateInfo = templateInfo;
        const targetPath = path.resolve(userHome, '.beyond-cli', 'template');
        const storePath = path.resolve(targetPath, 'node_modules');
        const pkg = new Package({
            targetPath,
            storePath,
            packageName: templateInfo.packageValue,
            packageVersion: templateInfo.packageVersion,
        });
        this.npmPkg = pkg;
        if (!await pkg.exists()) {
            const spinner = spinnerStart('正在下载模板...');
            try {
                await pkg.installPackage();
                spinner.succeed(colors.green('下载模板成功!'))
            }catch (e) {
                spinner.fail(colors.red('下载模板失败！'));
                throw e;
            }finally {
                spinner.stop();
            }
        }else {
            const spinner = spinnerStart('正在更新模板...');
            try {
                await pkg.updatePackage();
                spinner.succeed(colors.green('更新模板成功!'));
            }catch (e) {
                spinner.fail(colors.red('更新模板失败！'));
                throw e;
            }finally {
                spinner.stop();
            }
        }
    };

    async installTemplate() {
        if (this.templateInfo) {
            const { type = '' } = this.templateInfo;
            if (type && type !== TEMPLATE_TYPE_CUSTOM && type !== TEMPLATE_TYPE_NORMAL) {
                throw Error('组件模板类型无法识别！ type:' + type);
            }
            switch (type) {
                case TEMPLATE_TYPE_NORMAL:
                    await this.installTemplateNormal();
                    break;
                case TEMPLATE_TYPE_CUSTOM:
                    await this.installTemplateCustom();
                    break;
                default:
                    // 没有type默认走normal的逻辑
                    await this.installTemplateNormal();
                    break;
            }
        }else {
            throw Error('模板信息不存在！');
        }
    };

    async installTemplateNormal() {
        const { installCommand, startCommand, ignore = [] } = this.templateInfo;
        const sourcePath = path.resolve(this.npmPkg.getCacheFilePathByVersion(), 'template');
        const targetPath = process.cwd();
        fse.ensureDirSync(sourcePath);
        fse.ensureDirSync(targetPath);
        const spinner = spinnerStart('正在生成模板...');
        await sleep();
        try {
            fse.copySync(sourcePath, targetPath);
            spinner.succeed(colors.green('生成模板成功!'))
        }catch (e) {
            spinner.fail(colors.red('生成模板失败！'));
            throw e;
        }finally {
            spinner.stop();
        }

        await this.ejsRender({ ignore });
        await this.execCmd(installCommand, '执行installCommand失败！');
        await this.execCmd(startCommand, '执行startCommand失败！');
    };

    async installTemplateCustom() {
        if (await this.npmPkg.exists()) {
            const rootPath = this.npmPkg.getRootFilePath();
            if (!fse.existsSync(rootPath)) throw new Error('自定义模板入口文件不存在！')
            const sourcePath = path.resolve(this.npmPkg.getCacheFilePathByVersion(), 'template');
            const targetPath = process.cwd();
            const option = {
                templateInfo: this.templateInfo,
                projectInfo: this.projectInfo,
                sourcePath,
                targetPath
            }
            const code = `require('${rootPath}')(${JSON.stringify(option)})`
            await execCmdAsync('node', ['-e', code], {
                stdio: 'inherit',
                cwd: process.cwd(),
            })
        }
    };

    async execCmd(command = '', errMsg) {
        const [cmd, ...args] = command.split(' ');
        if (cmd) {
            if (!SAFE_COMMAND.includes(cmd)) return;
            const ret = await execCmdAsync(cmd, args, {
                stdio: 'inherit',
                cwd: process.cwd(),
            });
            if (ret !== 0) throw new Error(errMsg);
        }
    }

    async ejsRender(opt) {
        const dir = process.cwd();
        const projectInfo = this.projectInfo;
        return new Promise((resolve, reject) => {
            glob('**', {
                cwd: dir,
                ignore: ['**/node_modules/**', ...opt.ignore],
                nodir: true,
            }, (err, files) => {
                if (err) reject(err);
                Promise.all(files.map(file => {
                    const realPath = path.join(process.cwd(), file);
                    return new Promise((resolve1, reject1) => {
                        ejs.renderFile(realPath, projectInfo, {}, ((error, str) => {
                            if (error) reject1(error);
                            fse.writeFileSync(realPath, str);
                            resolve1();
                        }))
                    })
                })).then(() => {
                    resolve();
                }).catch(err => {
                    reject(err);
                })
            })
        })
    }

    isDirEmpty(localPath) {
        let fileList = fs.readdirSync(localPath);
        fileList = fileList.filter(file => (
            !file.startsWith('.') && !['node_modules'].includes(file)
        ))
        return fileList && fileList.length < 1
    };
}

function init(argv) {
    new InitCommand(argv)
}

module.exports = init;

