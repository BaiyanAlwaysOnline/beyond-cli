'use strict';
const axios = require('axios');

const CLI_BASE_URL = process.env.CLI_BASE_URL ? process.env.CLI_BASE_URL : 'http://beyondforever.site:7001';

const request = axios.create({
    baseURL: CLI_BASE_URL,
    timeout: 5000,
});

request.interceptors.response.use(
    ({ data }) => {
        if (data.status === 200) {
            return data.data;
        }
        return data;
    },
    error => {
        return Promise.reject(error);
    }
)


module.exports = request;

