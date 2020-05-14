const express = require('express');
const router = express.Router();
const path = require('path');
const axios = require('axios');

const movies_names = ['Ghostbusters', 'Gone with the wind', 'John Wick', 'Taxi Driver', "Howl's Moving Castle", 'Lady Bird', 'Ex Machina', "How to train your dragon"];
var simpleDatabase = [];

async function getMovies() {
    for(let movie of movies_names) {
        try {
            const dataMovie = await getMovie(movie);
            simpleDatabase.push(dataMovie.data);
            //console.log(movie);
            //console.log(dataMovie.data);
        } catch (error) {
            console.error(error);
        }
    }
    //return simpleDatabase;
}

async function getMovie(nameMovie) {
    try {
            return axios.get('http://www.omdbapi.com/', {
              params: {
                  apikey: process.env.OMDb_API_KEY,
                  t: nameMovie
              }
            });
    } catch (error) {
            console.error(error);
    }
}

// Make sure the database is up to date (In the future this will be triggered by the user!)
getMovies();

router.get('/', (req, res) => {
    res.render('movies');
});

router.get('/any', (req, res) => {
    const recommended_random_movie = Math.round(Math.random() * simpleDatabase.length);
    res.json({index: recommended_random_movie, data: simpleDatabase[recommended_random_movie]});
});

router.get('/infoMovies', async (req, res) => {
    res.json(simpleDatabase);
});

router.get('/:id', (req, res) => {
    try{
        const indexMovie = parseInt(req.params.id);
        if(isNaN(indexMovie)){
            res.send("This movie is not valid."); //normally we would flash around this error!
        } else if(indexMovie > simpleDatabase.length) res.send("This movie does not exist.");
        else res.json({index: indexMovie, data: simpleDatabase[indexMovie]});
    }catch(e){
        console.log(e);
    }
});

module.exports = router;