const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore();

const datetime = require('node-datetime');
const apiCalls = require('./apiCalls');

const seriesfolderid = 2236986238;
const moviesfolderid = 2236986256;
const PS4folderid = 2236528201;
const PCfolderid = 2236528198;
const excludefromindexes = ['Storyline', 'Summary', 'Tags', 'Synopsis', 'Writers', 'Actors'];

const getEntityDatabaseById = (kind, id) => {
    const entityKey = datastore.key([kind, id]);
    return datastore.get(entityKey);
};

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

async function getShowData(nameshow) {
    return new Promise(async (resolve, reject) => {
        // This function retrieves the information about a series or movie and formats it to the database's format
        try{
            const year = nameshow.match(/\((.*)\)/);
            let dataShowRaw, dataShow = {};
            if(year !== null){
                nameshow = nameshow.replace(` ${year[0]}`, "");
                dataShowRaw = await apiCalls.fetchDataOMDb(nameshow, year[1]);
            } else {
                dataShowRaw = await apiCalls.fetchDataOMDb(nameshow);
            }

            dataShowRaw = dataShowRaw.data;

            if(dataShowRaw.Response === 'False'){
                //if(dataShowRaw.Error === 'Movie not found!'){
                console.warn(nameshow + " could not be found in the database.");
                dataShow.Name = nameshow;
                dataShow.NotFound = true;
                dataShow.Type = 'Serie/Movie';
                resolve(dataShow);
                return;
                /*} else {
                    console.warn(`Could not retrieve data information for the show ${nameshow}.`);
                    reject();
                    return;
                }*/
            }
            if((typeof dataShowRaw.Poster === 'undefined') || (dataShowRaw.Poster === 'N/A')){
                console.warn(nameshow + " could not be found in the database.");
                dataShow.Name = nameshow;
                dataShow.NotFound = true;
                dataShow.Type = 'Serie/Movie';
                resolve(dataShow);
                return;
            }
            if((typeof dataShowRaw.Title === 'undefined') || (dataShowRaw.Title === 'N/A')){
                dataShowRaw.Title = nameshow;
            }
            if((typeof dataShowRaw.Plot === 'undefined') || (dataShowRaw.Plot === 'N/A')){
                dataShowRaw.Plot = "The plot could not be found for this serie.";
            }

            dataShow.Name = dataShowRaw.Title;
            dataShow.Synopsis = dataShowRaw.Plot;
            dataShow.Cover = dataShowRaw.Poster;
            dataShow.Writers = dataShowRaw.Writer;
            dataShow.Actors = dataShowRaw.Actors;
            dataShow.Year = dataShowRaw.Year;
            dataShow.Completed = false;
            dataShow.Slide_number = 'N/A';

            resolve(dataShow);
        } catch (error) {
            reject(error);
        }
    });
}

async function getVideogameData(namevideogame, platform) {
    return new Promise(async (resolve, reject) => {
        // This function retrieves the information about a videogame and formats it to the database's format
        try{
            // Get videogame, with ids
            let dataVideogameRaw, dataVideogame = {};
            dataVideogameRaw = await apiCalls.getVideogame(namevideogame, 'exact');
            if(!dataVideogameRaw.data.length){
                dataVideogameRaw = await apiCalls.getVideogame(namevideogame, 'general');
                if(!dataVideogameRaw.data.length){
                    dataVideogameRaw = await apiCalls.getVideogame(namevideogame, 'permissive');
                    if(!dataVideogameRaw.data.length){
                        console.warn(namevideogame + " could not be found in the database.");
                        dataVideogame.Name = namevideogame;
                        dataVideogame.NotFound = true;
                        dataVideogame.Type = 'Videogame';
                        resolve(dataVideogame);
                        return;                    
                    }
                }
            }
            dataVideogameRaw = dataVideogameRaw.data[0];

            dataVideogame.Name = dataVideogameRaw.name;
            dataVideogame.Platform = platform;

            // Find possible missing values in the data
            if((typeof dataVideogameRaw.storyline === 'undefined') && (typeof dataVideogameRaw.summary !== 'undefined')){
                // If the description is in summary instead of storyline
                dataVideogameRaw.storyline = dataVideogameRaw.summary;
                dataVideogameRaw.summary = "";
            } else if((typeof dataVideogameRaw.storyline !== 'undefined') && (typeof dataVideogameRaw.summary === 'undefined')){
                // If only storyline is defined
                dataVideogameRaw.summary = "";
            } else if((typeof dataVideogameRaw.storyline === 'undefined') && (typeof dataVideogameRaw.summary === 'undefined')){
                dataVideogameRaw.storyline = "The plot could not be retrieved for this videogame.";
                dataVideogameRaw.summary = "";
            }

            // Push it to the object that stores all the data of the item
            dataVideogame.Storyline = dataVideogameRaw.storyline;
            dataVideogame.Summary = dataVideogameRaw.summary;

            // Get the url to the videogame's cover
            const coverVideogame = await apiCalls.getCover(dataVideogameRaw.id);
            let coverVideogameUrl;

            // Get the first cover that has higher quality than 520px height
            for(var i = 0; i < coverVideogame.data.length; i++){
                if((coverVideogame.data[i].height > 270) || (typeof coverVideogame.data[i+1] === 'undefined')){
                    coverVideogameUrl = coverVideogame.data[i].url;
                    break;
                }
            }
            
            // Format the url and find its big size cover from IGDB (you can also use: "t_original")
            coverVideogameUrl = "https:" + coverVideogameUrl.replace("t_thumb", "t_cover_big");
            
            dataVideogame.Cover = coverVideogameUrl;
            dataVideogame.Slide_number = 'N/A';
            dataVideogame.Completed = false;
            dataVideogame.Active = false;
            dataVideogame.Tags = 'N/A';
            
            // Get the genre to the videogame
            let genres_videogame = [];
            if(typeof dataVideogameRaw.genres !== 'undefined'){
                for(let idgenre of dataVideogameRaw.genres){
                    var translatedGenre = await apiCalls.getGenre(idgenre);
                    genres_videogame.push(translatedGenre.data[0].name);
                }
            } else {
                genres_videogame = ['Unknown genre'];
            }

            dataVideogame.Genres = genres_videogame;

            // Return the videogame data to put in the database
            resolve(dataVideogame);

        } catch (error) {
            console.warn(error);
            reject(error);
        }
    });
}

async function updateSlideNumbersDatabase() {
    return new Promise( async (resolve, reject) => {
        try{
            // Update Slide_number property for each kind
            let batchUpdateEntities = await calculateSlideNumbersEntireDatabase();
            if(batchUpdateEntities.length) {
                console.log("Updating slide numbers in the database...");
                await datastore.save(batchUpdateEntities);
                console.log("Done updating slide numbers.");
                resolve();
            }
        } catch (error) {
            reject(error);
        }
    });
}

async function completedElementfromtheDatabase(entityKey, date) {
    return new Promise(async (resolve, reject) => {
        try{
            let formattedDate;
            if(date !== null){
                formattedDate = datetime.create(date, 'Y/m/d H:M').format();
            } else {
                formattedDate = 'YYYY/mm/dd H:M'
            }

            let [entity] = await datastore.get(entityKey);

            // Check if the entity exists in the database (it should, as we are updating information)
            if(!entity){
                entityKey.kind = 'Not_found'
                [entity] = await datastore.get(entityKey);
                if(!entity){
                    console.warn(`Warning: I cannot mark ${entityKey.name} as completed, because I could not find it in the database.`);
                    reject(-1);
                    return;
                }
            }

            // Update the information and mark the entity as completed
            entity.Completed = true;
            entity.Date_completion = formattedDate;

            // Return updated entity to be saved into database
            console.log(`Updating entity ${entity.Name} in the database.`);
            resolve(entity);

        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
}

async function calculateSlideNumbersEntireDatabase() {
    return new Promise(async (resolve, reject) => {
        try{
            let batchUpdateEntities = [];

            // Query every element in the database and order them by Name in ascending order
            // Do that for each kind independently

            // For Series
            var [entities] = await getEntitiesDatabase('Serie', false);

            if(entities.length){
                for(const [index, entity] of entities.entries()){
                    entity.Slide_number = index;
                    batchUpdateEntities.push({
                        key: entity[datastore.KEY], // So it uses the same entity's key
                        data: entity,
                        excludeFromIndexes: excludefromindexes
                    });
                }
            }

            var [entities] = await getEntitiesDatabase('Serie', true);

            if(entities.length){
                for(const [index, entity] of entities.entries()){
                    entity.Slide_number = index;
                    batchUpdateEntities.push({
                        key: entity[datastore.KEY], // So it uses the same entity's key
                        data: entity,
                        excludeFromIndexes: excludefromindexes
                    });
                }
            }

            // For Movies
            [entities] = await getEntitiesDatabase('Movie', false);

            if(entities.length){
                for(const [index, entity] of entities.entries()){
                    entity.Slide_number = index;
                    batchUpdateEntities.push({
                        key: entity[datastore.KEY], // So it uses the same entity's key
                        data: entity,
                        excludeFromIndexes: excludefromindexes
                    });
                }
            }

            [entities] = await getEntitiesDatabase('Movie', true);

            if(entities.length){
                for(const [index, entity] of entities.entries()){
                    entity.Slide_number = index;
                    batchUpdateEntities.push({
                        key: entity[datastore.KEY], // So it uses the same entity's key
                        data: entity,
                        excludeFromIndexes: excludefromindexes
                    });
                }
            }

            // For Videogames
            // here it has to be a different index counter for each platform

            // For Non-completed PC games
            [entities] = await getEntitiesDatabase('Videogame', false, 'PC');

            if(entities.length){
                for(const [index, entity] of entities.entries()){
                    entity.Slide_number = index;
                    batchUpdateEntities.push({
                        key: entity[datastore.KEY], // So it uses the same entity's key
                        data: entity,
                        excludeFromIndexes: excludefromindexes
                    });
                }
            }

            // For Completed PC games
            [entities] = await getEntitiesDatabase('Videogame', true, 'PC');

            if(entities.length){
                for(const [index, entity] of entities.entries()){
                    entity.Slide_number = index;
                    batchUpdateEntities.push({
                        key: entity[datastore.KEY], // So it uses the same entity's key
                        data: entity,
                        excludeFromIndexes: excludefromindexes
                    });
                }
            }

            // For Non-completed PS4 games
            [entities] = await getEntitiesDatabase('Videogame', false, 'PS4');

            if(entities.length){
                for(const [index, entity] of entities.entries()){
                    entity.Slide_number = index;
                    batchUpdateEntities.push({
                        key: entity[datastore.KEY], // So it uses the same entity's key
                        data: entity,
                        excludeFromIndexes: excludefromindexes
                    });
                }
            }

            // For Completed PS4 games
            [entities] = await getEntitiesDatabase('Videogame', true, 'PS4');

            if(entities.length){
                for(const [index, entity] of entities.entries()){
                    entity.Slide_number = index;
                    batchUpdateEntities.push({
                        key: entity[datastore.KEY], // So it uses the same entity's key
                        data: entity,
                        excludeFromIndexes: excludefromindexes
                    });
                }
            }
            resolve(batchUpdateEntities);

        } catch (error){
            console.log(error);
            reject(error);
        }
    });
}

async function updateDatabase() {
    try{
        let datafromTodoist;
        let batchStoreEntities = [], batchDeleteEntities = [];
        
        // Check if there is an existing sync_token in the database to do a partial sync
        const [sync_tokens] = await getEntitiesDatabase('Sync_token');
        global.twitchcredentials = await apiCalls.getTwitchAccessToken();

        const transaction = datastore.transaction();

        if(!sync_tokens.length){
            // If it doesn't exist:
            // Use the default sync_token to perform a full sync with Todoist
            console.log('Performing a full sync...');
            datafromTodoist = await apiCalls.getDataTodoist();
        } else {
            // If it exists:
            // Use the stored sync_token to perform a partial sync with the updates from Todoist
            console.log(`Performing a partial sync with ${sync_tokens[0].Token} as input token...`);
            datafromTodoist = await apiCalls.getDataTodoist(sync_tokens[0].Token);
        }

        for(let item of datafromTodoist.data.items) {
            let dataEntityformatted, entityKey;

            // What to do if it has been deleted
            if(item.is_deleted){
                let [entity] = await getEntityDatabaseById('Videogame', item.id);
                if(entity){
                    console.log("Found a videogame to delete!");
                } else {
                    [entity] = await getEntityDatabaseById('Serie', item.id);
                    if(entity){
                        console.log("Found a serie to delete!");
                    } else {
                        [entity] = await getEntityDatabaseById('Movie', item.id);
                        if(entity){
                            console.log("Found a movie to delete!");
                        } else {
                            [entity] = await getEntityDatabaseById('Not_found', item.id);
                            if(entity){
                                console.log("Found an item with no identified info to delete!");
                            } else {
                                console.log("The deleted item was either not important for the database or was already deleted.");
                            }
                        }
                    }
                }
                
                // Add the entity to the stack of entities to delete
                if(entity) batchDeleteEntities.push(entity[datastore.KEY]);
                continue;
            }
            
            if((item.project_id === seriesfolderid) || (item.project_id === moviesfolderid)){

                // ===========  Series or Movies ===========
                // Possible things can happen: the item has changed its name, it has been marked as completed, has been deleted, or it is a new entry
                entityKey = (item.project_id === seriesfolderid) ? datastore.key(['Serie', item.id]) : datastore.key(['Movie', item.id]);

                // What to do if it has been marked as completed
                if(item.checked){
                    try{
                        let updatedEntity = await completedElementfromtheDatabase(entityKey, item.date_completed);
                        if(updatedEntity !== -1){
                            batchStoreEntities.push({
                                key: updatedEntity[datastore.KEY],
                                data: updatedEntity,
                                excludeFromIndexes: excludefromindexes
                            });
                        }
                    } catch (error) {
                        console.warn("Something went wrong during checking a game.");
                        console.warn(error);
                    }
                    continue;
                }

                // What to do if it is a new entry || What to do if it has changed name
                dataEntityformatted = await getShowData(item.content);
                console.log(`Saving ${item.content} in the database... \n`);

            } else if((item.project_id === PCfolderid) || (item.project_id === PS4folderid)){
                
                // ===========  Videogames ===========
                // Possible things can happen: the item has changed its name, it has been marked as completed, has been deleted, or it is a new entry
                entityKey = datastore.key(['Videogame', item.id]);

                // What to do if it has been marked as completed
                if(item.checked){
                    try{
                        let updatedEntity = await completedElementfromtheDatabase(entityKey, item.date_completed);
                        if(updatedEntity !== -1){
                            batchStoreEntities.push({
                                key: updatedEntity[datastore.KEY],
                                data: updatedEntity,
                                excludeFromIndexes: excludefromindexes
                            });
                        }
                    } catch (error) {
                        console.warn("Something went wrong during checking a game.");
                        console.warn(error);
                    }
                    continue;
                }

                // What to do if it is a new entry || What to do if it has changed name
                dataEntityformatted = (item.project_id === PCfolderid) ? await getVideogameData(item.content, 'PC') : await getVideogameData(item.content, 'PS4');

                // Else the show has been found and has the correct format
                console.log(`Saving ${item.content} in the database... \n`);

            }

            if(dataEntityformatted && entityKey){
                if(dataEntityformatted.hasOwnProperty("NotFound")){
                    batchStoreEntities.push({
                        key: datastore.key(['Not_found', item.id]),
                        data: dataEntityformatted,
                        excludeFromIndexes: excludefromindexes
                    });
                } else {
                    // Check if the entity was previosuly not found
                    let deleteTokenKey = datastore.key(['Not_found', item.id]);
                    let [deleteEntity] = await datastore.get(deleteTokenKey);
                    if(deleteEntity) batchDeleteEntities.push(deleteTokenKey);
                    batchStoreEntities.push({
                        key: entityKey,
                        data: dataEntityformatted,
                        excludeFromIndexes: excludefromindexes
                    });
                }
            }

        }

        try{
            await transaction.run();

            // Delete deletable entities in batch
            if(batchDeleteEntities.length){
                console.log("Deleting items from the database...");
                transaction.delete(batchDeleteEntities);
            }

            // Save new entities in batch
            if(batchStoreEntities.length) {
                console.log("Saving new entries into the database...");
                transaction.save(batchStoreEntities);
            }

            // TODO: Save new sync_token into database once the information is updated
            const tokenKey = datastore.key(['Sync_token', 'Sync_token']);
            console.log('Saving new token into the database... \n');
            transaction.save({
                key: tokenKey,
                data: {
                    Token: datafromTodoist.data.sync_token
                },
            });

            // Perform a transaction to ensure that we do not lose information when updating the database
            await transaction.commit();
            console.log("Done.");
            
            // TODO: Check consistency of the database
            await updateSlideNumbersDatabase();

            // TODO: Inform the user that the database has been updated and free the semaphor

        } catch (error) {
            console.warn("An ERROR has been found.\nRolling back to previous state...");
            console.warn(error);
            await transaction.rollback();
        }

    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports = updateDatabase;