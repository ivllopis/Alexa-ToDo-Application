const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore();

async function getCovers(kind, completed, filterPlatformproperty) {
    let query;
    if(filterPlatformproperty !== undefined) {
        if(completed !== undefined) {
            query = datastore
            .createQuery(kind)
            .filter('Platform', '=', filterPlatformproperty)
            .filter('Completed', '=', completed)
            .order('Slide_number', {ascending: true});
        } else {
            throw new Error("Provide second argument in the call getEntities.");
        }
    } else if(completed !== undefined) {
        query = datastore
        .createQuery(kind)
        .filter('Completed', '=', completed)
        .order('Slide_number', {ascending: true});
    }
    return datastore.runQuery(query);
}

async function getNumberEntities(kind, completed, filterPlatformproperty) {
    let query;
    if(filterPlatformproperty !== undefined) {
        if(completed !== undefined) {
            query = datastore
            .createQuery(kind)
            .select('Slide_number')
            .filter('Platform', '=', filterPlatformproperty)
            .filter('Completed', '=', completed)
            .order('Slide_number', {descending: true})
            .limit(1);
        } else {
            throw new Error("Provide second argument in the call getEntities.");
        }
    } else if(completed !== undefined) {
        query = datastore
        .createQuery(kind)
        .select('Slide_number')
        .filter('Completed', '=', completed)
        .order('Slide_number', {descending: true})
        .limit(1);
    }

    return datastore.runQuery(query);
}

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

async function getInfoEntitiesTag(kind, filterTagproperty, completed, filterPlatformproperty) {
    let query = datastore.createQuery(kind);
    if(filterTagproperty !== undefined) {
        query = query.filter('Tags', '=', filterTagproperty);
    }
    if(completed !== undefined) {
        query = query.filter('Completed', '=', completed);
    }
    if(filterPlatformproperty !== undefined) {
        if(completed !== undefined) {
            query = query.filter('Platform', '=', filterPlatformproperty);
        } else {
            throw new Error("Provide second argument in the call getEntities.");
        }
    }
    
    // We order them by name
    query = query.order('Name', {ascending: true});

    return datastore.runQuery(query);
}

module.exports.getInfoEntity = getInfoEntity;
module.exports.getCovers = getCovers;
module.exports.getInfoEntitiesTag = getInfoEntitiesTag;
module.exports.getNumberEntities = getNumberEntities;