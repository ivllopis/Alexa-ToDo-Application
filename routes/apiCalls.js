const axios = require('axios');

/**
 * Log Todoist API error in a structured way for Google Cloud Logging (readable, no huge object dumps).
 */
function logTodoistSyncError(error, context = 'getDataTodoist') {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const body = error.response?.data;
    const message = error.message || 'Unknown error';
    // Single-line JSON for GCP log searchability; body may contain Todoist error_tag, error_code, error_extra
    const payload = {
                todoist_sync_error: true,
                context,
                http_status: status,
                http_status_text: statusText,
                todoist_error: typeof body === 'object' ? body : body,
                message
            };
    console.error(JSON.stringify(payload));
}

async function getDataTodoist(sync_token) {
    try {
            // Todoist Sync API requires application/x-www-form-urlencoded (see https://developer.todoist.com/api/v1/)
            const params = new URLSearchParams();
            const tokenValue = (sync_token === undefined || sync_token === 'undefined' || sync_token === null || sync_token === '')
                ? '*'
                : String(sync_token).trim();
            params.append('sync_token', tokenValue);
            params.append('resource_types', '["items"]');

            return axios.post('https://api.todoist.com/api/v1/sync', params.toString(), {
                headers: {
                    'Authorization': `Bearer ${process.env.TODOIST_API_KEY}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
    } catch (error) {
            logTodoistSyncError(error, 'getDataTodoist');
            throw error;
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
    const clientId = process.env.IGDB_API_CLIENT_ID;
    const clientSecret = process.env.IGDB_API_SECRET;
    if (!clientId || !clientSecret) {
        const msg = 'Missing Twitch/IGDB credentials: IGDB_API_CLIENT_ID and IGDB_API_SECRET must be set (e.g. in .env locally or env_variables in app.yaml on App Engine).';
        console.error(msg);
        throw new Error(msg);
    }
    try {
        return axios.post('https://id.twitch.tv/oauth2/token',
            null,
            {
                params: {
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: 'client_credentials'
                }
            });
    } catch (error) {
        console.error(JSON.stringify({
            twitch_token_error: true,
            message: error?.message,
            http_status: error?.response?.status,
            twitch_error: error?.response?.data
        }));
        throw error;
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