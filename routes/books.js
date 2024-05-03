const express = require('express');
const router = express.Router();

const authRouter = require('./auth');
const queries = require('./queries');

// Make sure the database is up to date (In the future this will be triggered by the user!)

router.get('/', authRouter.requireAuth, (req, res) => {
    res.render('books', {success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg'), books: true});
});

router.get('/completed', authRouter.requireAuth, (req, res) => {
    res.render('books', {success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg'), books_completed: true});
});

router.get('/any', async (req, res) => {
    const [entities] = await queries.getNumberEntities('Book', false);
    const num_total_entities = entities[0].Slide_number;
    const random_number = Math.round(Math.random() * num_total_entities);
    const [recommended_random_entity] = await queries.getInfoEntity(random_number, 'Book', false);
    res.json({index: random_number, data: recommended_random_entity[0]});
});

router.get('/completed/any', async (req, res) => {
    const [entities] = await queries.getNumberEntities('Book', true);
    const num_total_entities = entities[0].Slide_number;
    const random_number = Math.round(Math.random() * num_total_entities);
    const [recommended_random_entity] = await queries.getInfoEntity(random_number, 'Book', true);
    res.json({index: random_number, data: recommended_random_entity[0]});
});

router.get('/infoBooks', authRouter.requireAuth, async (req, res) => {
    queries.getCovers('Book', false)
    .then(infoBooks => {
        res.json(infoBooks[0]);
    }).catch(error => {
        res.send("Error occured:" + error);
    });
});

router.get('/completed/infoBooks', authRouter.requireAuth, async (req, res) => {
    queries.getCovers('Book', true)
    .then(infoBooks => {
        res.json(infoBooks[0]);
    }).catch(error => {
        res.send("Error occured:" + error);
    });
});

router.get('/:id', authRouter.requireAuth, async (req, res) => {
    try{
        const indexBook = parseInt(req.params.id);
        const [entities] = await queries.getNumberEntities('Book', false);
        const num_total_entities = entities[0].Slide_number;
        if(isNaN(indexBook)){
            res.send("This book is not valid."); //normally we would flash around this error!
        } else if(indexBook > num_total_entities) res.send("This book does not exist.");
        else {
            const [entity] = await queries.getInfoEntity(indexBook, 'Book', false);
            res.json({index: indexBook, data: entity[0]});
        }
    } catch(error) {
        res.send(error);
    }
});

router.get('/completed/:id', authRouter.requireAuth, async (req, res) => {
    try{
        const indexBook = parseInt(req.params.id);
        const [entities] = await queries.getNumberEntities('Book', true);
        const num_total_entities = entities[0].Slide_number;
        if(isNaN(indexBook)){
            res.send("This book is not valid."); //normally we would flash around this error!
        } else if(indexBook > num_total_entities) res.send("This book does not exist.");
        else {
            const [entity] = await queries.getInfoEntity(indexBook, 'Book', true);
            res.json({index: indexBook, data: entity[0]});
        }
    } catch(error) {
        res.send(error);
    }
});

router.get('/any/:filtertag', async (req, res) => {
    try {
        const filtertag = req.params.filtertag;
        const [entities] = await queries.getInfoEntitiesTag('Book', filtertag, false);
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
        const [entities] = await queries.getInfoEntitiesTag('Book', filtertag, true);
        const num_total_entities = entities.length;
        const random_number = Math.round(Math.random() * num_total_entities);
        res.json({index: random_number, data: entities[random_number]});
    } catch(error) {
        res.send(error);
    }
});

module.exports = router;