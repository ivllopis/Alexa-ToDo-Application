const axios = require('axios');

async function getDataTodoist(sync_token) {
    try {
            return axios.post('https://api.todoist.com/sync/v9/sync', {
                sync_token: sync_token !== 'undefined' ? sync_token : '*',
                resource_types: '["items"]'
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.TODOIST_API_KEY}`
                }
            });
    } catch (error) {
            console.error(`Error in apiCalls / getDataTodoist: \n${error}`);
    }
}

async function fetchDataOMDb(name, year) {
    try {
            if(typeof year === 'undefined'){
                return axios.get('http://www.omdbapi.com/', {
                    params: {
                        apikey: process.env.OMDb_API_KEY,
                        t: name,
                        plot: 'full'
                    }
                });
            } else {
                return axios.get('http://www.omdbapi.com/', {
                    params: {
                        apikey: process.env.OMDb_API_KEY,
                        t: name,
                        y: year,
                        plot: 'full'
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

            return axios.post('https://api.igdb.com/v4/games/',
                query,
                {
                    headers: {
                        'Client-ID': process.env.IGDB_API_CLIENT_ID,
                        'Authorization': `Bearer ${global.twitchcredentials.data.access_token}`
                    }
                });
    } catch (error) {
            console.error(error);
    }
}

async function getVideogameCover(idVideogame) {
    try {
            return axios.post('https://api.igdb.com/v4/covers',
                `fields *; where game = ${idVideogame};`, //body of filter parameters to include in the POST request
                {
                    headers: {
                        'Client-ID': process.env.IGDB_API_CLIENT_ID,
                        'Authorization': `Bearer ${global.twitchcredentials.data.access_token}`
                    }
                });
    } catch (error) {
            console.error(error);
    }
}

async function getVideogameGenre(idGenre) {
    try {
            return axios.post('https://api.igdb.com/v4/genres',
            `fields *; where id = ${idGenre};`, //body of filter parameters to include in the POST request
                {
                    headers: {
                        'Client-ID': process.env.IGDB_API_CLIENT_ID,
                        'Authorization': `Bearer ${global.twitchcredentials.data.access_token}`
                    }
                });
    } catch (error) {
            console.error(error);
    }
}

async function fetchBook(name, author) {
    try {
            if(typeof author === 'undefined'){
                return axios.get('https://openlibrary.org/search.json', {
                    params: {
                        q: name,
                        limit: 1
                    }
                });
            } else {
                return axios.get('https://openlibrary.org/search.json', {
                    params: {
                        title: name,
                        author: author,
                        limit: 1
                    }
                });
            }
    } catch (error) {
            console.error(error);
    }
}

async function fetchBookDescription(book_key) {
    try {
        return axios.get(`https://openlibrary.org${book_key}.json`, null);
    } catch (error) {
            console.error(error);
    }
}

async function getTwitchAccessToken() {
    try {
            return axios.post('https://id.twitch.tv/oauth2/token',
                null,
                {
                    params: {
                        'client_id': process.env.IGDB_API_CLIENT_ID,
                        'client_secret': process.env.IGDB_API_SECRET,
                        'grant_type': 'client_credentials'
                    }
                });
    } catch (error) {
            console.error(error);
    }
}

module.exports.getDataTodoist = getDataTodoist;
module.exports.fetchDataOMDb = fetchDataOMDb;
module.exports.getVideogame = getVideogame;
module.exports.getVideogameCover = getVideogameCover;
module.exports.getVideogameGenre = getVideogameGenre;
module.exports.fetchBook = fetchBook;
module.exports.fetchBookDescription = fetchBookDescription;
module.exports.getTwitchAccessToken = getTwitchAccessToken;