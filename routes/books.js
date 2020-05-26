const express = require('express');
const router = express.Router();
const axios = require('axios');

var simpleDatabase = {};

async function getData() {
    try {
            return axios.get('https://api.todoist.com/sync/v8/sync', {
              params: {
                  token: process.env.TODOIST_API_KEY,
                  sync_token: '*',
                  resource_types: '["all"]'
              }
            });
    } catch (error) {
            console.error(error);
    }
}

async function test() {
    try{
        simpleDatabase = await getData();
        console.log("Juegos de PC en Todoist:");
        for(let item of simpleDatabase.data.items) {
            if(item.project_id === 2236528198){
                console.log(item.content);
            }
        }
        /*console.log(simpleDatabase);
        console.log("Projects:");
        console.log(simpleDatabase.data.projects);
        console.log("Items:");
        console.log(simpleDatabase.data.items);
        console.log("\n\nNotes:");
        console.log(simpleDatabase.data.notes);*/
    } catch (error){
        console.log(error);
    }
}

// Make sure the database is up to date (In the future this will be triggered by the user!)
//test();

router.get('/', (req, res) => {
    //res.render('series');
    //res.json(simpleDatabase);
    res.send("This is currently implemented.");
});

module.exports = router;