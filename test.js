const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore();

const datetime = require('node-datetime');

const apiCalls = require('./routes/apiCalls');
const queries = require('./routes/queries');

const seriesfolderid = 2236986238;
const moviesfolderid = 2236986256;
const PS4folderid = 2236528201;
const PCfolderid = 2236528198;

require('dotenv').config();

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
        let datafromTodoist = await apiCalls.getDataTodoist('J9sPKQ9CiZ8nJZN1kAwfpX572eFbs30Hq52SYWVGmWJHsbmE1eKhDcBd6LbO3rElwhW_6wFBPwp9xLMCAZhKCkKvDMtsvvZh0bMueqITNa_5PQ');
        
        //console.log(datafromTodoist.data);
        //console.log(datafromTodoist.data);
        for(item of datafromTodoist.data.items){
            // console.log(item);
            /*
            if(item.date_completed !== null){
                const date = datetime.create(item.date_completed, 'Y/m/d H:M');
                const formattedDate = date.format();
                console.log("===========  Completed Item ===========");
                console.log(item.content);
                console.log(item.date_completed);
                console.log("DATE:");
                console.log(formattedDate + "\n\n");
            }*/

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

async function trythis(nameshow, year){
    //const [entities] = await queries.getCovers('Serie', false);
    if(typeof year === 'undefined'){
        dataShowRaw = await apiCalls.fetchDataOMDb(nameshow);
    } else {
        dataShowRaw = await apiCalls.fetchDataOMDb(nameshow, year);
    }
    
    console.log(dataShowRaw.data);

    /*if(!entities.length) console.log("I could not find anything in the database.");
    else {
        for(const [index, entity] of entities.entries()){
            console.log("Index: " + index);
            console.log(entity);
        }
    }*/
}

//quickstart();
// synchronizeData();
//sync_token_db('T8vRyIxQU_CeLifXys36sd3Z19qTwL59r4twbf4qlsKPLYShZsPTDZ_OqOHlk0xvfDI84fV4Qddp7pknmhMByoN4vnBlOqYaLH0NeMvcgSTdUGw');
// trythis('Groundhog day');
entityKeyasd = datastore.key(['Not_found', 'idk']);
console.log(entityKeyasd);
entityKeyasd.kind = 'Video_ass'
console.log(entityKeyasd);