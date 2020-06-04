const express = require('express');
const router = express.Router();
const path = require('path');
const axios = require('axios');
const TodoistApi = require('./todoistapi');

const authRouter = require('./auth');

const movies_names = [];
var simpleDatabase = [];

async function synchronizeData() {
    try{
        let datafromTodoist = await TodoistApi();
        
        for(let item of datafromTodoist.data.items) {
            if(item.project_id === 2236986256){
                movies_names.push(item.content);
            }
        }
        // Start archiving in the database (temporal)
        getMovies();
    } catch (error){
        console.log(error);
    }
}

async function getMovies() {
    for(let movie of movies_names) {
        try {
            const year = movie.match(/\((.*)\)/);
            let dataMovieRaw;
            if(year !== null){
                movie = movie.replace(` ${year[0]}`, "");
                dataMovieRaw = await getMovie(movie, year[1]);
            } else {
                dataMovieRaw = await getMovie(movie);
            }
            var dataMovie = dataMovieRaw.data;

            if((!dataMovie.hasOwnProperty("Poster")) || (dataMovie.Response === 'False')){
                console.warn(movie + " could not be found in the database.");
                continue;
            }
            if((typeof dataMovie.Poster === 'undefined') || (dataMovie.Poster === 'N/A')){
                console.warn(movie + " could not be found in the database.");
                continue;
            }
            if((typeof dataMovie.Title === 'undefined') || (dataMovie.Title === 'N/A')){
                dataMovie.Title = movie;
            }
            if((typeof dataMovie.Plot === 'undefined') || (dataMovie.Plot === 'N/A')){
                dataMovie.Plot = "The plot could not be found for this movie.";
            }
            simpleDatabase.push(dataMovie);
        } catch (error) {
            console.error(error);
        }
    }
    console.log("Completed loading movies.");
}

async function getMovie(nameMovie, year) {
    try {
            if(typeof year === 'undefined'){
                return axios.get('http://www.omdbapi.com/', {
                    params: {
                        apikey: process.env.OMDb_API_KEY,
                        t: nameMovie
                    }
                });
            } else {
                return axios.get('http://www.omdbapi.com/', {
                    params: {
                        apikey: process.env.OMDb_API_KEY,
                        t: nameMovie,
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
    res.render('movies', {success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg')});
});

router.get('/any', authRouter.requireAuth, (req, res) => {
    const recommended_random_movie = Math.round(Math.random() * simpleDatabase.length);
    res.json({index: recommended_random_movie, data: simpleDatabase[recommended_random_movie]});
});

router.get('/infoMovies', authRouter.requireAuth, async (req, res) => {
    res.json(simpleDatabase);
});

router.get('/:id', authRouter.requireAuth, (req, res) => {
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