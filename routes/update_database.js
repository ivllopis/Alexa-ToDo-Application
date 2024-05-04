const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore();

process.env.TZ = 'Europe/Madrid';

const datetime = require('node-datetime');
const apiCalls = require('./apiCalls');

const seriesfolderid = '2236986238';
const moviesfolderid = '2236986256';
const PS4folderid = '2236528201';
const PCfolderid = '2236528198';
const booksfolderid = '2236528216';
const excludefromindexes = ['Storyline', 'Summary', 'Synopsis', 'Writers', 'Actors'];

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
                console.warn(nameshow + " could not be found in the database.");
                dataShow.Name = nameshow;
                dataShow.NotFound = true;
                dataShow.Type = 'Serie/Movie';
                resolve(dataShow);
                return;
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
            dataShow.Tags = [];

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
            const coverVideogame = await apiCalls.getVideogameCover(dataVideogameRaw.id);
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
            dataVideogame.Tags = [];
            
            // Get the genre to the videogame
            let genres_videogame = [];
            if(typeof dataVideogameRaw.genres !== 'undefined'){
                for(let idgenre of dataVideogameRaw.genres){
                    var translatedGenre = await apiCalls.getVideogameGenre(idgenre);
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

async function getBookData(book_title) {
    return new Promise(async (resolve, reject) => {
        // This function retrieves the information about a book and formats it to the database's format
        try{
            let book_author = book_title.match(/\((.*)\)/);
            let book_entities, dataBook = {};
            if(book_author !== null){
                book_title = book_title.replace(` ${book_author[0]}`, "");
                book_entities = await apiCalls.fetchBook(book_title, book_author[1]);
            } else {
                book_entities = await apiCalls.fetchBook(book_title);
            }

            book_entities = book_entities.data.docs;
            
            // Check if we found the book
            if(book_entities.length === 0){
                console.warn(book_title + " could not be found in the database.");
                dataBook.Name = book_title;
                dataBook.NotFound = true;
                dataBook.Type = 'Book';
                resolve(dataBook);
                return;
            } else {
                // Get the data from the first book found
                let entity = book_entities[0];

                // Check if there is a cover ID
                if(typeof entity.cover_i === 'undefined'){
                    console.warn(book_title + " could not be found in the database.");
                    dataBook.Name = book_title;
                    dataBook.NotFound = true;
                    dataBook.Type = 'Book';
                    resolve(dataBook);
                    return;
                }

                let book_description = await apiCalls.fetchBookDescription(entity.key);
                dataBook.Name = entity.title;
                dataBook.Authors = entity.author_name;

                // Get the book description
                try {
                    if (typeof book_description.data.description === 'string'){
                        dataBook.Synopsis = book_description.data.description;
                    } else typeof book_description.data.description === 'object' ? dataBook.Synopsis = book_description.data.description.value: dataBook.Synopsis = "Description could not be found";
                } catch (error) {
                    console.warn(error);
                    dataBook.Synopsis = "Description could not be found";
                }
                dataBook.Publishing_year = entity.first_publish_year;
                dataBook.Rating = typeof entity.ratings_average === 'number' ? Math.round( entity.ratings_average * 1e2 ) / 1e2 : entity.ratings_average;
                dataBook.Number_of_pages = entity.number_of_pages_median;
                dataBook.Cover = typeof entity.cover_i !== 'undefined' ? `https://covers.openlibrary.org/b/id/${entity.cover_i}-M.jpg` : undefined;
                dataBook.Author_image = (typeof entity.author_key !== 'undefined') && (entity.author_key.length > 0) ? `https://covers.openlibrary.org/a/olid/${entity.author_key[0]}-M.jpg` : undefined;
                dataBook.Completed = false;
                dataBook.Slide_number = 'N/A';
                dataBook.Tags = [];
                resolve(dataBook);
                
            }
        } catch (error) {
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
                await datastore.save(batchUpdateEntities);
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

            // For Books
            [entities] = await getEntitiesDatabase('Book', false);

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

            [entities] = await getEntitiesDatabase('Book', true);

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

        // Create the transaction process
        const transaction = datastore.transaction();

        if(!sync_tokens.length){
            // If it doesn't exist:
            // Use the default sync_token to perform a full sync with Todoist
            datafromTodoist = await apiCalls.getDataTodoist();
        } else {
            // If it exists:
            // Use the stored sync_token to perform a partial sync with the updates from Todoist
            datafromTodoist = await apiCalls.getDataTodoist(sync_tokens[0].Token);
        }

        for(let item of datafromTodoist.data.items) {
            let dataEntityformatted, entityKey;

            // What to do if the entity has been deleted
            if(item.is_deleted){
                // TODO: Use the item.project_id so we don't have to retrieve all this data
                let [entity] = await getEntityDatabaseById('Videogame', parseInt(item.id));
                if(entity){
                    console.log("Found a videogame to delete!");
                } else {
                    [entity] = await getEntityDatabaseById('Serie', parseInt(item.id));
                    if(entity){
                        console.log("Found a serie to delete!");
                    } else {
                        [entity] = await getEntityDatabaseById('Movie', parseInt(item.id));
                        if(entity){
                            console.log("Found a movie to delete!");
                        } else {
                            [entity] = await getEntityDatabaseById('Book', parseInt(item.id));
                            if(entity){
                                console.log("Found a book to delete!");
                            } else {
                                [entity] = await getEntityDatabaseById('Not_found', parseInt(item.id));
                                if(entity){
                                    console.log("Found an item with no identified info to delete!");
                                } else {
                                    console.log("The deleted item was either not important for the database or was already deleted.");
                                }
                            }
                        }
                    }
                }
                
                // Add the entity to the stack of entities to delete
                if(entity) batchDeleteEntities.push(entity[datastore.KEY]);
                continue;
            }
            // TODO: refactor this part so we have a map between item.project_id with Kind key & method to retrieve data
            if((item.project_id === seriesfolderid) || (item.project_id === moviesfolderid)){

                // ===========  Series or Movies ===========
                // Possible things can happen: the item has changed its name, it has been marked as completed, has been deleted, or it is a new entry
                entityKey = (item.project_id === seriesfolderid) ? datastore.key(['Serie', parseInt(item.id)]) : datastore.key(['Movie', parseInt(item.id)]);

                // What to do if it has been marked as completed
                if(item.checked){
                    try{
                        let updatedEntity = await completedElementfromtheDatabase(entityKey, item.completed_at);
                        if(updatedEntity !== -1){
                            batchStoreEntities.push({
                                key: updatedEntity[datastore.KEY],
                                data: updatedEntity,
                                excludeFromIndexes: excludefromindexes
                            });
                        }
                    } catch (error) {
                        console.warn("Something went wrong while checking a show.");
                        console.warn(error);
                    }
                    continue;
                }

                // What to do if it is a new entry || What to do if it has changed name
                dataEntityformatted = await getShowData(item.content);

            } else if((item.project_id === PCfolderid) || (item.project_id === PS4folderid)){
                
                // ===========  Videogames ===========
                // Possible things can happen: the item has changed its name, it has been marked as completed, has been deleted, or it is a new entry
                entityKey = datastore.key(['Videogame', parseInt(item.id)]);

                // What to do if it has been marked as completed
                if(item.checked){
                    try{
                        let updatedEntity = await completedElementfromtheDatabase(entityKey, item.completed_at);
                        if(updatedEntity !== -1){
                            batchStoreEntities.push({
                                key: updatedEntity[datastore.KEY],
                                data: updatedEntity,
                                excludeFromIndexes: excludefromindexes
                            });
                        }
                    } catch (error) {
                        console.warn("Something went wrong while checking a game.");
                        console.warn(error);
                    }
                    continue;
                }

                // What to do if it is a new entry || What to do if it has changed name
                dataEntityformatted = (item.project_id === PCfolderid) ? await getVideogameData(item.content, 'PC') : await getVideogameData(item.content, 'PS4');

            } else if(item.project_id === booksfolderid){
                // ===========  Books ===========
                // Possible things can happen: the item has changed its name, it has been marked as completed, has been deleted, or it is a new entry
                entityKey = datastore.key(['Book', parseInt(item.id)]);

                // What to do if it has been marked as completed
                if(item.checked){
                    try{
                        let updatedEntity = await completedElementfromtheDatabase(entityKey, item.completed_at);
                        if(updatedEntity !== -1){
                            batchStoreEntities.push({
                                key: updatedEntity[datastore.KEY],
                                data: updatedEntity,
                                excludeFromIndexes: excludefromindexes
                            });
                        }
                    } catch (error) {
                        console.warn("Something went wrong while checking a book.");
                        console.warn(error);
                    }
                    continue;
                }

                // What to do if it is a new entry || What to do if it has changed name
                dataEntityformatted = await getBookData(item.content);
            }

            if(dataEntityformatted && entityKey){
                if(dataEntityformatted.hasOwnProperty("NotFound")){
                    batchStoreEntities.push({
                        key: datastore.key(['Not_found', parseInt(item.id)]),
                        data: dataEntityformatted,
                        excludeFromIndexes: excludefromindexes
                    });
                } else {
                    // Inherit the tags from Todoist
                    dataEntityformatted.Tags = item.labels;

                    // Check if the entity was previosuly not found
                    let deleteTokenKey = datastore.key(['Not_found', parseInt(item.id)]);
                    let [deleteEntity] = await datastore.get(deleteTokenKey);

                    // Delete the entity from Not Found before storing it in its intended category
                    if(deleteEntity) batchDeleteEntities.push(deleteTokenKey);

                    // Check if the entity was previosuly stored in DB
                    let [storedEntity] = await datastore.get(entityKey);
                    // If the entity existed in DB, store its relevant specifically set fields in the updated entity
                    if(storedEntity){
                        // Relevant fields for now: Tags, Date_completion, Expected_time_to_beat_h, First_playthrough_h & Linked_video
                        if ((typeof storedEntity.Tags !== 'undefined') && (storedEntity.Tags.length > dataEntityformatted.Tags.length)) dataEntityformatted.Tags = storedEntity.Tags;
                        // TODO: update the tags in Todoist and make this fetch from Todoist directly to update them
                        if (typeof storedEntity.Date_completion !== 'undefined') dataEntityformatted.Date_completion = storedEntity.Date_completion;
                        if (typeof storedEntity.Expected_time_to_beat_h !== 'undefined') dataEntityformatted.Expected_time_to_beat_h = storedEntity.Expected_time_to_beat_h;
                        if (typeof storedEntity.First_playthrough_h !== 'undefined') dataEntityformatted.First_playthrough_h = storedEntity.First_playthrough_h;
                        if (typeof storedEntity.Linked_video !== 'undefined') dataEntityformatted.Linked_video = storedEntity.Linked_video;
                    }

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
                transaction.delete(batchDeleteEntities);
            }

            // Save new entities in batch
            if(batchStoreEntities.length) {
                transaction.save(batchStoreEntities);
            }

            // Save new sync_token into database once the information is updated
            const tokenKey = datastore.key(['Sync_token', 'Sync_token']);
            transaction.save({
                key: tokenKey,
                data: {
                    Token: datafromTodoist.data.sync_token
                },
            });

            // Perform a transaction to ensure that we do not lose information when updating the database
            await transaction.commit();
            
            // Check consistency of the database
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
