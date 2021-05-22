const express = require('express');
const router = express.Router();

const authRouter = require('./auth');
const queries = require('./queries');

// Make sure the database is up to date (In the future this will be triggered by the user!)

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

router.get('/any', async (req, res) => {
    const random_number_platform = Math.round(Math.random());
    
    if (random_number_platform === 1) {
        // Recommend a PC game
        const [entities] = await queries.getNumberEntities('Videogame', false, 'PC');
        const num_total_entities = entities[0].Slide_number;
        const random_number = Math.round(Math.random() * num_total_entities);
        const [recommended_random_entity] = await queries.getInfoEntity(random_number, 'Videogame', false, 'PC');
        res.json({index: random_number, data: recommended_random_entity[0]});
    } else {
        // Recommend a PS4 game
        const [entities] = await queries.getNumberEntities('Videogame', false, 'PS4');
        const num_total_entities = entities[0].Slide_number;
        const random_number = Math.round(Math.random() * num_total_entities);
        const [recommended_random_entity] = await queries.getInfoEntity(random_number, 'Videogame', false, 'PS4');
        res.json({index: random_number, data: recommended_random_entity[0]});
    }

});

router.get('/any_completed', async (req, res) => {
    const random_number_platform = Math.round(Math.random());
    
    if (random_number_platform === 1) {
        // Recommend a PC game
        const [entities] = await queries.getNumberEntities('Videogame', true, 'PC');
        const num_total_entities = entities[0].Slide_number;
        const random_number = Math.round(Math.random() * num_total_entities);
        const [recommended_random_entity] = await queries.getInfoEntity(random_number, 'Videogame', true, 'PC');
        res.json({index: random_number, data: recommended_random_entity[0]});
    } else {
        // Recommend a PS4 game
        const [entities] = await queries.getNumberEntities('Videogame', true, 'PS4');
        const num_total_entities = entities[0].Slide_number;
        const random_number = Math.round(Math.random() * num_total_entities);
        const [recommended_random_entity] = await queries.getInfoEntity(random_number, 'Videogame', true, 'PS4');
        res.json({index: random_number, data: recommended_random_entity[0]});
    }
    
});

router.get('/pc/any', async (req, res) => {
    const [entities] = await queries.getNumberEntities('Videogame', false, 'PC');
    const num_total_entities = entities[0].Slide_number;
    const random_number = Math.round(Math.random() * num_total_entities);
    const [recommended_random_entity] = await queries.getInfoEntity(random_number, 'Videogame', false, 'PC');
    res.json({index: random_number, data: recommended_random_entity[0]});
});

router.get('/pc/infoVideogames', authRouter.requireAuth, async (req, res) => {
    queries.getCovers('Videogame', false, 'PC')
    .then(infoPCVideogames => {
        res.json(infoPCVideogames[0]);
    }).catch(error => {
        res.send("Error occured:" + error);
    });
});

router.get('/pc/:id', authRouter.requireAuth, async (req, res) => {
    try{
        const indexVideogame = parseInt(req.params.id);
        const [entities] = await queries.getNumberEntities('Videogame', false, 'PC');
        const num_total_entities = entities[0].Slide_number;
        if(isNaN(indexVideogame)){
            res.send("This videogame id is not valid."); //normally we would flash around this error!
        } else if(indexVideogame > num_total_entities) res.send("This videogame does not exist.");
        else {
            const [entity] = await queries.getInfoEntity(indexVideogame, 'Videogame', false, 'PC');
            res.json({index: indexVideogame, data: entity[0]});
        }
    } catch(error) {
        res.send(error);
    }
});

router.get('/pc_completed/any', async (req, res) => {
    const [entities] = await queries.getNumberEntities('Videogame', true, 'PC');
    const num_total_entities = entities[0].Slide_number;
    const random_number = Math.round(Math.random() * num_total_entities);
    const [recommended_random_entity] = await queries.getInfoEntity(random_number, 'Videogame', true, 'PC');
    res.json({index: random_number, data: recommended_random_entity[0]});
});

router.get('/pc_completed/infoVideogames', authRouter.requireAuth, async (req, res) => {
    queries.getCovers('Videogame', true, 'PC')
    .then(infoPCVideogames => {
        res.json(infoPCVideogames[0]);
    }).catch(error => {
        res.send("Error occured:" + error);
    });
});

router.get('/pc_completed/:id', authRouter.requireAuth, async (req, res) => {
    try{
        const indexVideogame = parseInt(req.params.id);
        const [entities] = await queries.getNumberEntities('Videogame', true, 'PC');
        const num_total_entities = entities[0].Slide_number;
        if(isNaN(indexVideogame)){
            res.send("This videogame id is not valid."); //normally we would flash around this error!
        } else if(indexVideogame > num_total_entities) res.send("This videogame does not exist.");
        else {
            const [entity] = await queries.getInfoEntity(indexVideogame, 'Videogame', true, 'PC');
            res.json({index: indexVideogame, data: entity[0]});
        }
    } catch(error) {
        res.send(error);
    }
});

router.get('/ps4/any', async (req, res) => {
    const [entities] = await queries.getNumberEntities('Videogame', false, 'PS4');
    const num_total_entities = entities[0].Slide_number;
    const random_number = Math.round(Math.random() * num_total_entities);
    const [recommended_random_entity] = await queries.getInfoEntity(random_number, 'Videogame', false, 'PS4');
    res.json({index: random_number, data: recommended_random_entity[0]});
});

router.get('/ps4/infoVideogames', authRouter.requireAuth, async (req, res) => {
    queries.getCovers('Videogame', false, 'PS4')
    .then(infoPS4Videogames => {
        res.json(infoPS4Videogames[0]);
    }).catch(error => {
        res.send("Error occured:" + error);
    });
});

router.get('/ps4/:id', authRouter.requireAuth, async (req, res) => {
    try{
        const indexVideogame = parseInt(req.params.id);
        const [entities] = await queries.getNumberEntities('Videogame', false, 'PS4');
        const num_total_entities = entities[0].Slide_number;
        if(isNaN(indexVideogame)){
            res.send("This videogame id is not valid."); //normally we would flash around this error!
        } else if(indexVideogame > num_total_entities) res.send("This videogame does not exist.");
        else {
            const [entity] = await queries.getInfoEntity(indexVideogame, 'Videogame', false, 'PS4');
            res.json({index: indexVideogame, data: entity[0]});
        }
    } catch(error) {
        res.send(error);
    }
});

router.get('/ps4_completed/any', async (req, res) => {
    const [entities] = await queries.getNumberEntities('Videogame', true, 'PS4');
    const num_total_entities = entities[0].Slide_number;
    const random_number = Math.round(Math.random() * num_total_entities);
    const [recommended_random_entity] = await queries.getInfoEntity(random_number, 'Videogame', true, 'PS4');
    res.json({index: random_number, data: recommended_random_entity[0]});
});

router.get('/ps4_completed/infoVideogames', authRouter.requireAuth, async (req, res) => {
    queries.getCovers('Videogame', true, 'PS4')
    .then(infoPS4Videogames => {
        res.json(infoPS4Videogames[0]);
    }).catch(error => {
        res.send("Error occured:" + error);
    });
});

router.get('/ps4_completed/:id', authRouter.requireAuth, async (req, res) => {
    try{
        const indexVideogame = parseInt(req.params.id);
        const [entities] = await queries.getNumberEntities('Videogame', true, 'PS4');
        const num_total_entities = entities[0].Slide_number;
        if(isNaN(indexVideogame)){
            res.send("This videogame id is not valid."); //normally we would flash around this error!
        } else if(indexVideogame > num_total_entities) res.send("This videogame does not exist.");
        else {
            const [entity] = await queries.getInfoEntity(indexVideogame, 'Videogame', true, 'PS4');
            res.json({index: indexVideogame, data: entity[0]});
        }
    } catch(error) {
        res.send(error);
    }
});

module.exports = router;