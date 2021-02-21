'use strict';

/**
 * @file npm的各种方法
 */
const urlJoin = require('url-join');
const axios = require('axios');
const semver = require('semver');


function getNpmInfo(pkgName, registry) {
    if (!pkgName) return null;
    // https://registry.npm.taobao.org
    // https://registry.npmjs.org
    registry = registry ? registry : "https://registry.npm.taobao.org";
    const npmUrl = urlJoin(registry, pkgName);
    return axios.get(npmUrl)
        .then(({ status, data }) => {
            if (status === 200) {
                return data;
            }
            return null;
        })
        .catch(err => {
            return Promise.reject(err);
        })
}

async function getNpmVersions(pkgName, registry) {
    let { versions = {} } = await getNpmInfo(pkgName, registry);
    versions = Object.keys(versions);
    return versions;
}

function sortVersions(versions) {
    return versions.sort((a, b) => semver.gt(b, a) ? 1 : -1)
}

async function getSemverVersions(baseVersion, pkgName, registry) {
    const versions = await getNpmVersions(pkgName, registry);
    return sortVersions(
        versions
        .filter(version => semver.satisfies(version, `>${baseVersion}`))
    )
}

async function getLastNpmVersion(pkgName, registry) {
    const versions = await getNpmVersions(pkgName, registry);
    return sortVersions(versions)[0];
}

module.exports = {
    getSemverVersions,
    getLastNpmVersion
};

