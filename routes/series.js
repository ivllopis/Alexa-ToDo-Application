const express = require('express');
const router = express.Router();
const path = require('path');
const axios = require('axios');

const series_names = ['Brooklyn Nine-Nine', 'Game of Thrones', 'Lost', 'Big Mouth', 'Rick and Morty', 'Naruto Shippuden', 'Dragon Ball Z', 'Vikings', 'After Life', 'Lucifer', 'The Witcher'];
var simpleDatabase = [];

async function getSeries() {
    for(let serie of series_names) {
        try {
            const dataSerie = await getSerie(serie);
            simpleDatabase.push(dataSerie.data);
            //console.log(serie);
            //console.log(dataSerie.data);
        } catch (error) {
            console.error(error);
        }
    }
    //return simpleDatabase;
}

async function getSerie(nameSerie) {
    try {
            return axios.get('http://www.omdbapi.com/', {
              params: {
                  apikey: process.env.OMDb_API_KEY,
                  t: nameSerie
              }
            });
    } catch (error) {
            console.error(error);
    }
}

// Make sure the database is up to date (In the future this will be triggered by the user!)
getSeries();

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/series.html'));
});

router.get('/any', (req, res) => {
    const recommended_random_serie = Math.round(Math.random() * simpleDatabase.length);
    res.json({indexSerie: recommended_random_serie, data: simpleDatabase[recommended_random_serie]});
});

router.get('/infoSeries', async (req, res) => {
    res.json(simpleDatabase);
});

router.get('/:id', (req, res) => {
    try{
        const indexSerie = parseInt(req.params.id);
        if(isNaN(indexSerie)){
            res.send("This serie is not valid."); //normally we would flash around this error!
        } else if(indexSerie > simpleDatabase.length) res.send("This series does not exist.");
        else res.json({indexSerie: indexSerie, data: simpleDatabase[indexSerie]});
    }catch(e){
        console.log(e);
    }
});

module.exports = router;