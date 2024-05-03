const express = require('express');
const router = express.Router();

const authRouter = require('./auth');
const queries = require('./queries');

// Make sure the database is up to date (In the future this will be triggered by the user!)

router.get('/', authRouter.requireAuth, (req, res) => {
    res.render('movies', {success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg'), movies: true});
});

router.get('/completed', authRouter.requireAuth, (req, res) => {
    res.render('movies', {success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg'), movies_completed: true});
});

router.get('/any', async (req, res) => {
    const [entities] = await queries.getNumberEntities('Movie', false);
    const num_total_entities = entities[0].Slide_number;
    const random_number = Math.round(Math.random() * num_total_entities);
    const [recommended_random_entity] = await queries.getInfoEntity(random_number, 'Movie', false);
    res.json({index: random_number, data: recommended_random_entity[0]});
});

router.get('/completed/any', async (req, res) => {
    const [entities] = await queries.getNumberEntities('Movie', true);
    const num_total_entities = entities[0].Slide_number;
    const random_number = Math.round(Math.random() * num_total_entities);
    const [recommended_random_entity] = await queries.getInfoEntity(random_number, 'Movie', true);
    res.json({index: random_number, data: recommended_random_entity[0]});
});

router.get('/infoMovies', authRouter.requireAuth, async (req, res) => {
    queries.getCovers('Movie', false)
    .then(infoMovies => {
        res.json(infoMovies[0]);
    }).catch(error => {
        res.send("Error occured:" + error);
    });
});

router.get('/completed/infoMovies', authRouter.requireAuth, async (req, res) => {
    queries.getCovers('Movie', true)
    .then(infoMovies => {
        res.json(infoMovies[0]);
    }).catch(error => {
        res.send("Error occured:" + error);
    });
});

router.get('/:id', authRouter.requireAuth, async (req, res) => {
    try{
        const indexMovie = parseInt(req.params.id);
        const [entities] = await queries.getNumberEntities('Movie', false);
        const num_total_entities = entities[0].Slide_number;
        if(isNaN(indexMovie)){
            res.send("This movie is not valid."); //normally we would flash around this error!
        } else if(indexMovie > num_total_entities) res.send("This movie does not exist.");
        else {
            const [entity] = await queries.getInfoEntity(indexMovie, 'Movie', false);
            res.json({index: indexMovie, data: entity[0]});
        }
    } catch(error) {
        res.send(error);
    }
});

router.get('/completed/:id', authRouter.requireAuth, async (req, res) => {
    try{
        const indexMovie = parseInt(req.params.id);
        const [entities] = await queries.getNumberEntities('Movie', true);
        const num_total_entities = entities[0].Slide_number;
        if(isNaN(indexMovie)){
            res.send("This movie is not valid."); //normally we would flash around this error!
        } else if(indexMovie > num_total_entities) res.send("This movie does not exist.");
        else {
            const [entity] = await queries.getInfoEntity(indexMovie, 'Movie', true);
            res.json({index: indexMovie, data: entity[0]});
        }
    } catch(error) {
        res.send(error);
    }
});

router.get('/any/:filtertag', async (req, res) => {
    try {
        const filtertag = req.params.filtertag;
        const [entities] = await queries.getInfoEntitiesTag('Movie', filtertag, false);
        const num_total_entities = entities.length;
        const random_number = Math.round(Math.random() * num_total_entities);
        res.json({index: random_number, data: entities[random_number]});
    } catch(error) {
        res.send(error);
    }
});

router.get('/completed/any/:filtertag', async (req, res) => {
    try {
        const filtertag = req.params.filtertag;
        const [entities] = await queries.getInfoEntitiesTag('Movie', filtertag, true);
        const num_total_entities = entities.length;
        const random_number = Math.round(Math.random() * num_total_entities);
        res.json({index: random_number, data: entities[random_number]});
    } catch(error) {
        res.send(error);
    }
});

module.exports = router;