const express = require('express');
const router = express.Router();
const axios = require('axios');

async function getDataTodoist() {
    try {
            return axios.get('https://api.todoist.com/sync/v8/sync', {
              params: {
                  token: process.env.TODOIST_API_KEY,
                  sync_token: '*',
                  resource_types: '["items"]'
              }
            });
    } catch (error) {
            console.error(error);
    }
}

module.exports = getDataTodoist;