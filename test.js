const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore();

const datetime = require('node-datetime');

const apiCalls = require('./routes/apiCalls');
const queries = require('./routes/queries');
const update_calls = require('./routes/update_database');

const seriesfolderid = '2236986238';
const moviesfolderid = '2236986256';
const PS4folderid = '2236528201';
const PCfolderid = '2236528198';

require('dotenv').config();

const getEntitiesDatabase = (kind, completed, filterPlatformproperty) => {
    let query;
    if(filterPlatformproperty) {
        if(completed) {
            query = datastore
            .createQuery(kind)
            .filter('Platform', '=', filterPlatformproperty)
            .filter('Completed', '=', true)
            .order('Name', {ascending: true});
        } else {
            query = datastore
            .createQuery(kind)
            .filter('Platform', '=', filterPlatformproperty)
            .filter('Completed', '=', false)
            .order('Name', {ascending: true});
        }
    } else if(kind === 'Sync_token') {
        query = datastore
        .createQuery(kind)
        .order('Token', {ascending: true});
    } else if(completed) {
        query = datastore
        .createQuery(kind)
        .filter('Completed', '=', completed)
        .order('Name', {ascending: true});
    } else {
        query = datastore
        .createQuery(kind)
        .filter('Completed', '=', false)
        .order('Name', {ascending: true});
    }

    return datastore.runQuery(query);
};

async function getInfoEntity(slide_n, kind, completed, filterPlatformproperty) {
    let query;
    if(filterPlatformproperty !== undefined) {
        if(completed !== undefined) {
            query = datastore
            .createQuery(kind)
            .filter('Platform', '=', filterPlatformproperty)
            .filter('Completed', '=', completed)
            .filter('Slide_number', '=', slide_n)
            .limit(1);
        } else {
            throw new Error("Provide second argument in the call getEntities.");
        }
    } else if(completed !== undefined) {
        query = datastore
        .createQuery(kind)
        .filter('Completed', '=', completed)
        .filter('Slide_number', '=', slide_n)
        .limit(1);
    }

    return datastore.runQuery(query);
}

async function getCovers(kind, completed, filterPlatformproperty) {
    let query;
    if(filterPlatformproperty !== undefined) {
        if(completed !== undefined) {
            query = datastore
            .createQuery(kind)
            .select(['Cover', 'Slide_number'])
            .filter('Platform', '=', filterPlatformproperty)
            .filter('Completed', '=', completed)
            .order('Slide_number', {ascending: true});
        } else {
            throw new Error("Provide second argument in the call getEntities.");
        }
    } else if(completed !== undefined) {
        query = datastore
        .createQuery(kind)
        .select(['Cover', 'Slide_number'])
        .filter('Completed', '=', completed)
        .order('Slide_number', {ascending: true});
    }

    return datastore.runQuery(query);
}

async function synchronizeData() {
    try{
        let datafromTodoist = await apiCalls.getDataTodoist('Bb19VvNlXqEid5KzEYVES-RfcQACrvm_1DtRKAgfI2NiXlq5IMFz8dEpva69why6A-d9LKFu1CK8YRGEjKEbnCHlULlGWKuRu-x7Evayrxdbcg');
        
        //console.log(datafromTodoist.data);
        //console.log(datafromTodoist.data);
        for(item of datafromTodoist.data.items){
            console.log(item);
            
            if(item.completed_at !== null){
                const date = datetime.create(item.completed_at, 'Y/m/d H:M');
                const formattedDate = date.format();
                console.log("===========  Completed Item ===========");
                console.log(item.content);
                console.log(item.completed_at);
                console.log("DATE:");
                console.log(formattedDate + "\n\n");
            }

            if((item.project_id === moviesfolderid)){ //  || (item.project_id === seriesfolderid)
                console.log("===========  Series/Movies ===========");
                console.log(item.content);
                // ===========  Videogames ===========
            }

            if((item.project_id === PS4folderid)){ //(item.project_id === PCfolderid) || 
                console.log("===========  Videogames ===========");
                console.log(item.content);
                // ===========  Videogames ===========
            }
           //console.log(item);
        }
        //let newdata = await TodoistApi(datafromTodoist.data.sync_token);
    } catch (error){
        console.log(error);
    }
}

async function quickstart() {
    // The kind for the new entity
    const kind = 'Sync_token';

    // The name/ID for the new entity
    const name = 'Sync token';

    // The Cloud Datastore key for the new entity
    const taskKey = datastore.key([kind, name]);
    const transaction = datastore.transaction();

    try{
        transaction.run((err) => {
            if (err) {
                // Error handling omitted.
                console.log(err);
                return;
            }

            transaction.get(taskKey, (err, entity) => {
                if (err) {
                    // Error handling omitted.
                    console.log(err);
                    return;
                }
                //console.log(entity);

                if(typeof(entity) === 'undefined'){
                    console.log("Did not find an entity like that in the database.");
                    transaction.save({
                        key: taskKey,
                        data: {
                            Description: "This is my another very new description",
                            Completed: false,
                            Beach: 1
                        }
                    });
                    console.log("Creating a new entry...");
                } else {
                    console.log("Current entity:");
                    console.log(entity);

                    entity.Description = "This is my another new description";
                    entity.Completed = true;
                    entity.Beach = 5;

                    transaction.save({
                        key: taskKey,
                        data: entity
                    });
                    console.log("New entity:");
                    console.log(entity);
                }

                transaction.commit((err) => {
                if (!err) {
                    // Transaction committed successfully.
                    console.log("Everything went fine!");
                }
                });
            });
        });

    } catch (error){
        await transaction.rollback();
        throw error;
    }
}

async function sync_token_db(token) {
    // The kind for the new entity
    const kind = 'Sync_token';

    // The name/ID for the new entity
    const name = 'Sync token';

    // The Cloud Datastore key for the new entity
    const tokenKey = datastore.key([kind, name]);

    // Prepares the new entity
    const tokenEntity = {
        key: tokenKey,
        data: {
            Token: token
        },
    };

    // Saves the entity
    //await datastore.delete(tokenKey);
    await datastore.save(tokenEntity);
    console.log(`Saved ${tokenEntity.key}: ${tokenEntity.data.Token}`);
}

const getVisits = (kind, platform, completed) => {
  const query = datastore
        .createQuery(kind)
        .filter('Platform', '=', platform)
        .filter('Completed', '=', completed)
        .order('Name', {ascending: true});

  return datastore.runQuery(query);
};

async function trythis(nameshow){
    //const [entities] = await queries.getCovers('Serie', false);
    try{
        console.log("Twitch Token")
        let twitchtoken = await apiCalls.getTwitchAccessToken();
        console.log(twitchtoken)
        console.log("=============\n\n")
        // console.log(twitchtoken)
        // res = await apiCalls.getTwitchAccessToken();
        // global.twitchcredentials = await apiCalls.getTwitchAccessToken();
        // dataShowRaw = await apiCalls.getVideogame(nameshow, 'general');
        
        // console.log(dataShowRaw.data);
    } catch (error){
        console.log(error)
    }

    /*if(!entities.length) console.log("I could not find anything in the database.");
    else {
        for(const [index, entity] of entities.entries()){
            console.log("Index: " + index);
            console.log(entity);
        }
    }*/
}

// quickstart();
synchronizeData();
// sync_token_db('T8vRyIxQU_CeLifXys36sd3Z19qTwL59r4twbf4qlsKPLYShZsPTDZ_OqOHlk0xvfDI84fV4Qddp7pknmhMByoN4vnBlOqYaLH0NeMvcgSTdUGw');
// trythis('Bloodborne');
// entityKeyasd = datastore.key(['Not_found', 'idk']);
