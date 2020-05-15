const express = require('express');
const router = express.Router();
const path = require('path');
const axios = require('axios');

const videogames_names = ["The Witcher 3", "Destiny 2", "Bloodborne", "Dark Souls", "The Last of Us", "Dark Souls III"];
var simpleDatabase = [];

async function getVideogames() {
    for(let videogame of videogames_names) {
        try {
            // Get videogame, with ids
            var dataVideogame = await getVideogame(videogame);
            dataVideogame = dataVideogame.data[0];
            if((typeof dataVideogame.storyline === 'undefined') && (typeof dataVideogame.summary !== 'undefined')){ // If the description is in summary instead of storyline
                dataVideogame.storyline = dataVideogame.summary; // substitute storyline for summary
                delete dataVideogame.summary; //delete summary
            }

            // Get the url to the videogame's cover
            const coverVideogame = await getCover(dataVideogame.id);
            let coverVideogameUrl;

            // Get the first cover that has higher quality than 520px height
            for(var i = 0; i < coverVideogame.data.length; i++){
                if((coverVideogame.data[i].height > 500) || (typeof coverVideogame.data[i+1] === 'undefined')){
                    coverVideogameUrl = coverVideogame.data[i].url;
                    break;
                }
            }
            
            // Format the url and find the cover in its original size from IGDB
            coverVideogameUrl = "https:" + coverVideogameUrl;
            coverVideogameUrl = coverVideogameUrl.replace("t_thumb", "t_original");
            dataVideogame.cover = coverVideogameUrl;
            
            // Get the genre to the videogame
            let genres_videogame = [];
            for(let idgenre of dataVideogame.genres){
                var translatedGenre = await getGenre(idgenre);
                genres_videogame.push(translatedGenre.data[0].name);
            }
            dataVideogame.genres = genres_videogame;

            // Put the videogame in the temporal database
            simpleDatabase.push(dataVideogame);

        } catch (error) {
            console.error(error);
        }
    }
}

async function getVideogame(nameVideogame) {
    try {
            return axios.post('https://api-v3.igdb.com/games/',
                `search "${nameVideogame}"; fields id, cover, genres, involved_companies, name, storyline, summary, tags; limit 1;`, //body of filter parameters to include in the POST request
                {
                headers: {
                    'user-key': process.env.IGDB_API_KEY
                }
                });
    } catch (error) {
            console.error(error);
    }
}

async function getCover(idVideogame) {
    try {
            return axios.post('https://api-v3.igdb.com/covers',
                `fields *; where game = ${idVideogame};`, //body of filter parameters to include in the POST request
                {
                headers: {
                    'user-key': process.env.IGDB_API_KEY
                }
                });
    } catch (error) {
            console.error(error);
    }
}

async function getGenre(idGenre) {
    try {
            return axios.post('https://api-v3.igdb.com/genres',
            `fields *; where id = ${idGenre};`, //body of filter parameters to include in the POST request
                {
                headers: {
                    'user-key': process.env.IGDB_API_KEY
                }
                });
    } catch (error) {
            console.error(error);
    }
}

async function getDeveloper(idCompany) {
    try {
            return axios.post('https://api-v3.igdb.com/companies',
            `fields name; where id = ${idCompany};`, //body of filter parameters to include in the POST request
                {
                headers: {
                    'user-key': process.env.IGDB_API_KEY
                }
                });
    } catch (error) {
            console.error(error);
    }
}

async function test(){
    try{
        //try async function

    }catch(error){
        console.error(error);
    }
}

// Make sure the database is up to date (In the future this will be triggered by the user!)
//test();
getVideogames();

router.get('/', (req, res) => {
    res.render('videogames');
    //res.send("This is my videogame page.");
});

router.get('/any', (req, res) => {
    const recommended_random_videogame = Math.round(Math.random() * simpleDatabase.length);
    res.json({index: recommended_random_videogame, data: simpleDatabase[recommended_random_videogame]});
});

router.get('/infoVideogames', async (req, res) => {
    res.json(simpleDatabase);
});

router.get('/:id', (req, res) => {
    try{
        const indexVideogame = parseInt(req.params.id);
        if(isNaN(indexVideogame)){
            res.send("This videogame is not valid."); //normally we would flash around this error!
        } else if(indexVideogame > simpleDatabase.length) res.send("This videogame does not exist.");
        else res.json({index: indexVideogame, data: simpleDatabase[indexVideogame]});
    }catch(e){
        console.log(e);
    }
});

module.exports = router;