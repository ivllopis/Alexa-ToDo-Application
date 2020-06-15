const express = require('express');
const router = express.Router();
const axios = require('axios');
const TodoistApi = require('./todoistapi');

const authRouter = require('./auth');

var videogames_names = {pc: [], pc_completed: [], ps4: [], ps4_completed: []};
var simpleDatabase = {pc: [], pc_completed: [], ps4: [], ps4_completed: []};

async function synchronizeData() {
    try{
        let datafromTodoist = await TodoistApi();
        
        for(let item of datafromTodoist.data.items) {
            if(item.project_id === 2236528198){
                videogames_names.pc.push(item.content);
            } else if(item.project_id === 2236529771){
                videogames_names.pc_completed.push(item.content);
            } else if(item.project_id === 2236528201){
                videogames_names.ps4.push(item.content);
            } else if(item.project_id === 2236529601){
                videogames_names.ps4_completed.push(item.content);
            }
        }
        // Start archiving in the database (temporal)
        getVideogames();
    } catch (error){
        console.log(error);
    }
}

async function getVideogames() {
    for([platform, list_videogames] of Object.entries(videogames_names)){
        for(let videogame of list_videogames){
            try {
                // Get videogame, with ids
                var dataVideogameRaw;
                dataVideogameRaw = await getVideogame(videogame, 'exact');
                if(!dataVideogameRaw.data.length){
                    dataVideogameRaw = await getVideogame(videogame, 'general');
                    if(!dataVideogameRaw.data.length){
                        dataVideogameRaw = await getVideogame(videogame, 'permissive');
                        if(!dataVideogameRaw.data.length){
                            console.warn(videogame + " could not be found in the database.");
                            continue;                        
                        }
                    }
                }
                var dataVideogame = dataVideogameRaw.data[0];
                
                if((typeof dataVideogame.storyline === 'undefined') && (typeof dataVideogame.summary !== 'undefined')){ // If the description is in summary instead of storyline
                    dataVideogame.storyline = dataVideogame.summary; // substitute storyline for summary
                    delete dataVideogame.summary; //delete summary
                }

                // Get the url to the videogame's cover
                const coverVideogame = await getCover(dataVideogame.id);
                let coverVideogameUrl;

                // Get the first cover that has higher quality than 520px height
                for(var i = 0; i < coverVideogame.data.length; i++){
                    if((coverVideogame.data[i].height > 270) || (typeof coverVideogame.data[i+1] === 'undefined')){
                        coverVideogameUrl = coverVideogame.data[i].url;
                        break;
                    }
                }
                
                // Format the url and find the cover in its original size from IGDB
                coverVideogameUrl = "https:" + coverVideogameUrl;
                coverVideogameUrl = coverVideogameUrl.replace("t_thumb", "t_cover_big"); //t_original
                dataVideogame.cover = coverVideogameUrl;
                
                // Get the genre to the videogame
                if(typeof dataVideogame.genres !== 'undefined'){
                    let genres_videogame = [];
                    for(let idgenre of dataVideogame.genres){
                        var translatedGenre = await getGenre(idgenre);
                        genres_videogame.push(translatedGenre.data[0].name);
                    }
                    dataVideogame.genres = genres_videogame;
                } else {
                    dataVideogame.genres = ['Unknown genre'];
                }

                // Put the videogame in the temporal database
                simpleDatabase[platform].push(dataVideogame);
                //console.log(videogame + " completed.");

            } catch (error) {
                console.log(videogame + " could not be completed.");
                console.error(error);
            }
        }
    }
    console.log("Completed loading videogames.");
}

async function getVideogame(nameVideogame, mode) {
    try {   
            let query; //body of filter parameters to include in the POST request
            if(mode === 'exact'){
                query = `search "${nameVideogame}"; where name = "${nameVideogame}"; fields id, cover, genres, involved_companies, name, storyline, summary, tags; limit 1;`;
            } else if(mode === 'general'){
                query = `search "${nameVideogame}"; where version_parent = null; fields id, cover, genres, involved_companies, name, storyline, summary, tags; limit 1;`;
            } else {
                query = `search "${nameVideogame}"; fields id, cover, genres, involved_companies, name, storyline, summary, tags; limit 1;`;
            }

            return axios.post('https://api-v3.igdb.com/games/',
                query,
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

// Make sure the database is up to date (In the future this will be triggered by the user!)
synchronizeData();

router.get('/', authRouter.requireAuth, (req, res) => {
    res.render('videogames_landing', {success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg')});
});

router.get('/ps4', authRouter.requireAuth, (req, res) => {
    res.render('videogames', {ps4: true});
});

router.get('/pc', authRouter.requireAuth, (req, res) => {
    res.render('videogames', {pc: true});
});

router.get('/ps4_completed', authRouter.requireAuth, (req, res) => {
    res.render('videogames', {ps4_completed: true});
});

router.get('/pc_completed', authRouter.requireAuth, (req, res) => {
    res.render('videogames', {pc_completed: true});
});

router.get('/pc/any', authRouter.requireAuth, (req, res) => {
    const recommended_random_videogame = Math.round(Math.random() * simpleDatabase.pc.length);
    res.json({index: recommended_random_videogame, data: simpleDatabase.pc[recommended_random_videogame]});
});

router.get('/pc/infoVideogames', authRouter.requireAuth, async (req, res) => {
    res.json(simpleDatabase.pc); //add some security
});

router.get('/pc/:id', authRouter.requireAuth, (req, res) => {
    try{
        const indexVideogame = parseInt(req.params.id);
        if(isNaN(indexVideogame)){
            res.send("This videogame is not valid."); //normally we would flash around this error!
        } else if(indexVideogame > simpleDatabase.pc.length) res.send("This videogame does not exist.");
        else res.json({index: indexVideogame, data: simpleDatabase.pc[indexVideogame]});
    }catch(e){
        console.log(e);
    }
});

router.get('/ps4/any', authRouter.requireAuth, (req, res) => {
    const recommended_random_videogame = Math.round(Math.random() * simpleDatabase.ps4.length);
    res.json({index: recommended_random_videogame, data: simpleDatabase.ps4[recommended_random_videogame]});
});

router.get('/ps4/infoVideogames', authRouter.requireAuth, async (req, res) => {
    res.json(simpleDatabase.ps4); //add some security
});

router.get('/ps4/:id', authRouter.requireAuth, (req, res) => {
    try{
        const indexVideogame = parseInt(req.params.id);
        if(isNaN(indexVideogame)){
            res.send("This videogame is not valid."); //normally we would flash around this error!
        } else if(indexVideogame > simpleDatabase.ps4.length) res.send("This videogame does not exist.");
        else res.json({index: indexVideogame, data: simpleDatabase.ps4[indexVideogame]});
    }catch(e){
        console.log(e);
    }
});

router.get('/ps4_completed/any', authRouter.requireAuth, (req, res) => {
    const recommended_random_videogame = Math.round(Math.random() * simpleDatabase.ps4_completed.length);
    res.json({index: recommended_random_videogame, data: simpleDatabase.ps4_completed[recommended_random_videogame]});
});

router.get('/ps4_completed/infoVideogames', authRouter.requireAuth, async (req, res) => {
    res.json(simpleDatabase.ps4_completed); //add some security
});

router.get('/ps4_completed/:id', authRouter.requireAuth, (req, res) => {
    try{
        const indexVideogame = parseInt(req.params.id);
        if(isNaN(indexVideogame)){
            res.send("This videogame is not valid."); //normally we would flash around this error!
        } else if(indexVideogame > simpleDatabase.ps4_completed.length) res.send("This videogame does not exist.");
        else res.json({index: indexVideogame, data: simpleDatabase.ps4_completed[indexVideogame]});
    }catch(e){
        console.log(e);
    }
});

router.get('/pc_completed/any', authRouter.requireAuth, (req, res) => {
    const recommended_random_videogame = Math.round(Math.random() * simpleDatabase.pc_completed.length);
    res.json({index: recommended_random_videogame, data: simpleDatabase.pc_completed[recommended_random_videogame]});
});

router.get('/pc_completed/infoVideogames', authRouter.requireAuth, async (req, res) => {
    res.json(simpleDatabase.pc_completed); //add some security
});

router.get('/pc_completed/:id', authRouter.requireAuth, (req, res) => {
    try{
        const indexVideogame = parseInt(req.params.id);
        if(isNaN(indexVideogame)){
            res.send("This videogame is not valid."); //normally we would flash around this error!
        } else if(indexVideogame > simpleDatabase.pc_completed.length) res.send("This videogame does not exist.");
        else res.json({index: indexVideogame, data: simpleDatabase.pc_completed[indexVideogame]});
    }catch(e){
        console.log(e);
    }
});

module.exports = router;