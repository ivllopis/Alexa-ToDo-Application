const express = require('express');
const router = express.Router();
const axios = require('axios');
const TodoistApi = require('./todoistapi');

const authRouter = require('./auth');

const series_names = [];
var simpleDatabase = [];

async function synchronizeData() {
    try{
        //console.log("Series en Todoist:");
        let datafromTodoist = await TodoistApi();

        for(let item of datafromTodoist.data.items) {
            if(item.project_id === 2236986238){
                series_names.push(item.content);
            }
        }
        // Start archiving in the database (temporal)
        getSeries();
    } catch (error){
        console.log(error);
    }
}

async function getSeries() {
    for(let serie of series_names) {
        try {
            const year = serie.match(/\((.*)\)/);
            let dataSerieRaw;
            if(year !== null){
                serie = serie.replace(` ${year[0]}`, "");
                dataSerieRaw = await getSerie(serie, year[1]);
            } else {
                dataSerieRaw = await getSerie(serie);
            }

            var dataSerie = dataSerieRaw.data;

            if((!dataSerie.hasOwnProperty("Poster")) || (dataSerie.Response === 'False')){
                console.warn(serie + " could not be found in the database.");
                continue;
            }
            if((typeof dataSerie.Poster === 'undefined') || (dataSerie.Poster === 'N/A')){
                console.warn(serie + " could not be found in the database.");
                continue;
            }
            if((typeof dataSerie.Title === 'undefined') || (dataSerie.Title === 'N/A')){
                dataSerie.Title = serie;
            }
            if((typeof dataSerie.Plot === 'undefined') || (dataSerie.Plot === 'N/A')){
                dataSerie.Plot = "The plot could not be found for this serie.";
            }
            simpleDatabase.push(dataSerie);
        } catch (error) {
            console.error(error);
        }
    }
    console.log("Completed loading series.");
}

async function getSerie(nameSerie, year) {
    try {
            if(typeof year === 'undefined'){
                return axios.get('http://www.omdbapi.com/', {
                    params: {
                        apikey: process.env.OMDb_API_KEY,
                        t: nameSerie
                    }
                });
            } else {
                return axios.get('http://www.omdbapi.com/', {
                    params: {
                        apikey: process.env.OMDb_API_KEY,
                        t: nameSerie,
                        y: year
                    }
                });
            }
    } catch (error) {
            console.error(error);
    }
}

// Make sure the database is up to date (In the future this will be triggered by the user!)
synchronizeData();

router.get('/', authRouter.requireAuth, (req, res) => {
    res.render('series', {success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg')});
});

router.get('/any', authRouter.requireAuth, (req, res) => {
    const recommended_random_serie = Math.round(Math.random() * simpleDatabase.length);
    res.json({index: recommended_random_serie, data: simpleDatabase[recommended_random_serie]});
});

router.get('/infoSeries', authRouter.requireAuth, async (req, res) => {
    res.json(simpleDatabase);
});

router.get('/:id', authRouter.requireAuth, (req, res) => {
    try{
        const indexSerie = parseInt(req.params.id);
        if(isNaN(indexSerie)){
            res.send("This serie is not valid."); //normally we would flash around this error!
        } else if(indexSerie >= simpleDatabase.length) res.send("This series does not exist.");
        else res.json({index: indexSerie, data: simpleDatabase[indexSerie]});
    }catch(e){
        console.log(e);
    }
});

module.exports = router;