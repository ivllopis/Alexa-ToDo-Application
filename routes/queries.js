const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore();

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

module.exports.getInfoEntity = getInfoEntity;
module.exports.getCovers = getCovers;
module.exports.getNumberEntities = getNumberEntities;