const express = require('express');
const router = express.Router();

const authRouter = require('./auth');
const queries = require('./queries');

// Make sure the database is up to date (In the future this will be triggered by the user!)

router.get('/', authRouter.requireAuth, (req, res) => {
    res.render('series', {success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg'), series: true});
});

router.get('/completed', authRouter.requireAuth, (req, res) => {
    res.render('series', {success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg'), series_completed: true});
});

router.get('/any', async (req, res) => {
    try {
        const [entities] = await queries.getNumberEntities('Serie', false);
        const num_total_entities = entities[0].Slide_number;
        const random_number = Math.round(Math.random() * num_total_entities);
        const [recommended_random_entity] = await queries.getInfoEntity(random_number, 'Serie', false);
        res.json({index: random_number, data: recommended_random_entity[0]});
    } catch(error) {
        res.send(error);
    }
});

router.get('/completed/any', async (req, res) => {
    try {
        const [entities] = await queries.getNumberEntities('Serie', true);
        const num_total_entities = entities[0].Slide_number;
        const random_number = Math.round(Math.random() * num_total_entities);
        const [recommended_random_entity] = await queries.getInfoEntity(random_number, 'Serie', true);
        res.json({index: random_number, data: recommended_random_entity[0]});
    } catch(error) {
        res.send(error);
    }
});

router.get('/infoSeries', authRouter.requireAuth, async (req, res) => {
    queries.getCovers('Serie', false)
    .then(infoSeries => {
        res.json(infoSeries[0]);
    }).catch(error => {
        res.send("Error occured:" + error);
    });
});

router.get('/completed/infoSeries', authRouter.requireAuth, async (req, res) => {
    queries.getCovers('Serie', true)
    .then(infoSeries => {
        res.json(infoSeries[0]);
    }).catch(error => {
        res.send("Error occured:" + error);
    });
});

router.get('/:id', authRouter.requireAuth, async (req, res) => {
    try{
        const indexSerie = parseInt(req.params.id);
        const [entities] = await queries.getNumberEntities('Serie', false);
        const num_total_entities = entities[0].Slide_number;
        if(isNaN(indexSerie)){
            res.send("This serie is not valid."); //normally we would flash around this error!
        } else if(indexSerie > num_total_entities) res.send("This series does not exist.");
        else {
            const [entity] = await queries.getInfoEntity(indexSerie, 'Serie', false);
            res.json({index: indexSerie, data: entity[0]});
        }
    } catch(error) {
        res.send(error);
    }
});

router.get('/completed/:id', authRouter.requireAuth, async (req, res) => {
    try{
        const indexSerie = parseInt(req.params.id);
        const [entities] = await queries.getNumberEntities('Serie', true);
        const num_total_entities = entities[0].Slide_number;
        if(isNaN(indexSerie)){
            res.send("This serie is not valid."); //normally we would flash around this error!
        } else if(indexSerie > num_total_entities) res.send("This series does not exist.");
        else {
            const [entity] = await queries.getInfoEntity(indexSerie, 'Serie', true);
            res.json({index: indexSerie, data: entity[0]});
        }
    } catch(error) {
        res.send(error);
    }
});

router.get('/any/:filtertag', async (req, res) => {
    try {
        const filtertag = req.params.filtertag;
        const [entities] = await queries.getInfoEntitiesTag('Serie', filtertag, false);
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
        const [entities] = await queries.getInfoEntitiesTag('Serie', filtertag, true);
        const num_total_entities = entities.length;
        const random_number = Math.round(Math.random() * num_total_entities);
        res.json({index: random_number, data: entities[random_number]});
    } catch(error) {
        res.send(error);
    }
});

module.exports = router;