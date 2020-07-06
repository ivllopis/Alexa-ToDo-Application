const axios = require('axios');

async function getDataTodoist(sync_token) {
    try {
            return axios.get('https://api.todoist.com/sync/v8/sync', {
              params: {
                  token: process.env.TODOIST_API_KEY,
                  sync_token: sync_token !== 'undefined' ? sync_token : '*',
                  resource_types: '["items"]'
              }
            });
    } catch (error) {
            console.error(error);
    }
}

async function fetchDataOMDb(name, year) {
    try {
            if(typeof year === 'undefined'){
                return axios.get('http://www.omdbapi.com/', {
                    params: {
                        apikey: process.env.OMDb_API_KEY,
                        t: name
                    }
                });
            } else {
                return axios.get('http://www.omdbapi.com/', {
                    params: {
                        apikey: process.env.OMDb_API_KEY,
                        t: name,
                        y: year
                    }
                });
            }
    } catch (error) {
            console.error(error);
    }
}

async function getVideogame(nameVideogame, mode) {
    try {   
            let query; //body of filter parameters to include in the POST request
            if(mode === 'exact'){
                query = `search "${nameVideogame}"; where name = "${nameVideogame}"; fields id, cover, genres, involved_companies, name, storyline, summary, tags; limit 1;`;
            } else if(mode === 'general'){
                query = `search "${nameVideogame}"; where version_parent = null; fields id, cover, genres, involved_companies, name, storyline, summary, tags; limit 1;`;
            } else {
                query = `search "${nameVideogame}"; fields id, cover, genres, involved_companies, name, storyline, summary, tags; limit 1;`;
            }

            return axios.post('https://api-v3.igdb.com/games/',
                query,
                {
                headers: {
                    'user-key': process.env.IGDB_API_KEY
                }
                });
    } catch (error) {
            console.error(error);
    }
}

async function getCover(idVideogame) {
    try {
            return axios.post('https://api-v3.igdb.com/covers',
                `fields *; where game = ${idVideogame};`, //body of filter parameters to include in the POST request
                {
                headers: {
                    'user-key': process.env.IGDB_API_KEY
                }
                });
    } catch (error) {
            console.error(error);
    }
}

async function getGenre(idGenre) {
    try {
            return axios.post('https://api-v3.igdb.com/genres',
            `fields *; where id = ${idGenre};`, //body of filter parameters to include in the POST request
                {
                headers: {
                    'user-key': process.env.IGDB_API_KEY
                }
                });
    } catch (error) {
            console.error(error);
    }
}

module.exports.getDataTodoist = getDataTodoist;
module.exports.fetchDataOMDb = fetchDataOMDb;
module.exports.getVideogame = getVideogame;
module.exports.getCover = getCover;
module.exports.getGenre = getGenre;