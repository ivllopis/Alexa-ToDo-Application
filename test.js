const apiCalls = require('./routes/apiCalls');
const axios = require('axios');

const datetime = require('node-datetime');

const seriesfolderid = '2236986238';
const moviesfolderid = '2236986256';
const PS4folderid = '2236528201';
const PCfolderid = '2236528198';

require('dotenv').config();


async function synchronizeData() {
    try{
        let datafromTodoist = await apiCalls.getDataTodoist('SAqOI94fqtfd2qNGUj33TsAMzl3h5jLsgyWH4NdFkPy7qheT3clRGvqIavg_yQECKRpJR_-EG6XLJdIyM_Pb-7eeMyoUgaFDNn9EbYEO2pxiNw');
        
        console.log(datafromTodoist.data);
        /*for(item of datafromTodoist.data.items){
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

            if((item.project_id === moviesfolderid) || (item.project_id === seriesfolderid)){ //  
                console.log("===========  Series/Movies ===========");
                console.log(item.content);
            }

            if((item.project_id === PCfolderid) || (item.project_id === PS4folderid)){ // 
                console.log("===========  Videogames ===========");
                console.log(item.content);
            }
           //console.log(item);
        }*/
    } catch (error){
        console.log(error);
    }
}

async function fetchBookData(name, author) {
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

async function trythis(){
    try{
        let book_title = 'Well of Ascension (Brandon Sanderson)'; //'The Way of Kings (Brandon Sanderson)'; //'El libro de los caídos'; // 'Never (Ken Follett)';
        let book_author = book_title.match(/\((.*)\)/);
        let book_entities;
        if(book_author !== null){
            book_title = book_title.replace(` ${book_author[0]}`, "");
            console.log(`Title: ${book_title}\t Author: ${book_author[1]}\n\n`);
            book_entities = await fetchBookData(book_title, book_author[1]);
        } else {
            book_entities = await fetchBookData(book_title);
        }

        console.log(book_entities.data.docs[0]);
        if(book_entities.data.docs.length === 0){
            console.log("Not found!");
        } else {
            let entity = book_entities.data.docs[0];
            let book_description = await fetchBookDescription(entity.key);
            console.log("Title of the book: ", entity.title);
            console.log("Author of the book: ", entity.author_name);
            // Get the book description
            console.log("Description Raw: ", book_description.data.description);
            if (typeof book_description.data.description.value !== 'undefined'){
                console.log("Description: ", book_description.data.description.value);
            } else console.log("Description: ", book_description.data.description);
            console.log("Rating: ", entity.ratings_average);
            console.log("Publishing year: ", entity.first_publish_year);
            console.log("Number of pages: ", entity.number_of_pages_median);
            console.log("Cover URL: ", `https://covers.openlibrary.org/b/id/${entity.cover_i}-L.jpg`);
            console.log("Author URL: ", `https://covers.openlibrary.org/a/olid/${entity.author_key[0]}-L.jpg`);
            // TODO: Make the cover static (once stored in DB? So we have control of which one? Just like other parameters)
        }
    } catch (error){
        console.log(error);
    }
}

// synchronizeData();
trythis();
