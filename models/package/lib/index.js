'use strict';
const pkgDir = require('pkg-dir').sync;
const path = require('path');
const npminstall = require('npminstall');
const fse = require('fs-extra');
const pathExists = require('path-exists').sync;

const { isObject } = require('@beyond-cli/utils');
const formatPath = require('@beyond-cli/format-path');
const { getLastNpmVersion } = require('@beyond-cli/get-npm-info');

class Package {
    constructor(options) {
        if (!isObject(options)) {
            throw new Error('Package: options must be an object');
        }
        if (!options) {
            throw new Error('Package: options are required');
        }
        this.targetPath = options.targetPath;
        this.storePath = options.storePath;
        this.packageName = options.packageName;
        this.packageVersion = options.packageVersion;
    }

     getCacheFilePathByVersion(version = this.packageVersion) {
        const prefix = this.packageName.replace('/', '_');
        const cacheFileName = `_${prefix}@${version}@${this.packageName}`
        return path.resolve(this.storePath, cacheFileName);
    }

    async installPackage() {
        await npminstall({
            root: this.targetPath,
            pkgs: [
              { name: this.packageName, version: this.packageVersion },
            ],
            storeDir: this.storePath,
        });
    }

    async updatePackage() {
        const lastVersion = await getLastNpmVersion(this.packageName);
        const lastVersionPath = this.getCacheFilePathByVersion(lastVersion);
        if (!pathExists(lastVersionPath)) {
            await npminstall({
                root: this.targetPath,
                pkgs: [
                    { name: this.packageName, version: lastVersion },
                ],
                storeDir: this.storePath,
            });
        }
        this.packageVersion = lastVersion;
    }

    async handlePrepareBeforeExists() {
        if (this.storePath && !pathExists(this.storePath)) {
            fse.mkdirpSync(this.storePath);
        }
        if (this.packageVersion === 'latest') {
            this.packageVersion =  await getLastNpmVersion(this.packageName);
        }
    }

    /**
     * 判断pkg是否存在
     */
    async exists() {
        if (this.storePath) {
           await this.handlePrepareBeforeExists();
           return pathExists(this.getCacheFilePathByVersion());
        }else {
            return pathExists(this.targetPath);
        }
    }

    // 获取入口文件根路径
    getRootFilePath() {
        function _getRootFilePath(targetPath) {
            // 1.找到package.json
            const dir = pkgDir(targetPath);
            if (dir) {
                // 2.找到main/lib
                const pkgDir = require(path.resolve(dir, 'package.json'));
                if (pkgDir && pkgDir.main) {
                    // 3.路径的兼容
                    return formatPath(path.resolve(dir, pkgDir.main));
                }
            }
            return null;
        }
        if (this.storePath) {
            return _getRootFilePath(this.getCacheFilePathByVersion());
        }else {
            return _getRootFilePath(this.targetPath);
        }
    }
}

module.exports = Package;

