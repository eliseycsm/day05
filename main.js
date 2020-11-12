//import required libraries
const express = require('express')
const handlebars = require('express-handlebars')
const withQuery = require('with-query').default
const fetch = require('node-fetch')

//config PORT & API_KEY & URL
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000;
const API_KEY = process.env.API_KEY || ''
const URL = "https://newsapi.org/v2/top-headlines"

const app = express()

//config handlebars
app.engine('hbs', handlebars({defaultLayout: 'default.hbs'}))
app.set('view engine', 'hbs')

app.use(express.static(__dirname + '/static')) //for static folders later

const cleaned = (dataArr) => {
    const dataset = dataArr.articles.map( (ele) => {
        const title = ele['title']
        const pubTime = ele['publishedAt']
        const url = ele['url']
        const image = ele['urlToImage'] 
        const summary = ele['description']
        return {title, pubTime, url, image, summary}
    } )
    return dataset
}


app.post('/search', 
    express.urlencoded({extended: true}),
    express.json(),
    async (req, resp) => {

        const data = req.body
        const searchKey = data.q
        const searchCountry = data.country
        const searchCategory = data.category
        const fullURL = withQuery(URL, {
            q: searchKey, //searchTerm
            apiKey: API_KEY,
            country: searchCountry,
            category: searchCategory,
            pageSize: 12
        })

        //to use apiKey in http header to access instead of storing as a variable separately
        /* 
        const headers = {
            "x-Api-key": "API_KEY_HERE"
          }
        const params = {
            q: data.q,
            country: data.country,
            category: data.category
        }

        const result = await fetch(URL, {method: 'POST', headers: headers, body: params})
        or
        
        fetch(url, {headers}).then(result =>result.json())
            .then(result => {log result}).catch(err=>{log error})
        */
        const cacheData = cacheCart 
        console.info('cacheData: ', cacheData)        

        let addRecord = true;
        for (let record of cacheData) {
            let matchKey = Boolean(record.searchKey === searchKey)
            let matchCountry = Boolean(record.searchCountry === searchCountry)
            let matchCategory = Boolean(record.searchCategory === searchCategory)
            if (matchKey && matchCountry && matchCategory) {
                dataset = record['dataset']
                addRecord = false
                console.info('search retrieved from cache')
            }
        }

        if (addRecord) {
            //retrieve news from api via fetch 
            //console.info(`fullURL: `, fullURL)
            const result = await fetch(fullURL) //fetching data
            const p = await result.json() //convert to json obj
            var dataset = cleaned(p) //arr of result articles
            //console.info(dataset.length, ' results array cleaned.')
            
            const cacheSet = { searchKey, searchCountry, searchCategory, dataset}
            console.info("cacheSet: ", cacheSet)
            cacheData.push(cacheSet)
            console.info('search has been cached')
        }

        resp.status(200)
        resp.type('text/html')
        resp.render('results', 
            {
                dataset: dataset, 
                searchTerm: searchKey,
                noContent: !dataset.length
            })
})

const cacheCart = []  
//unlike hidden value caching on browser, we can cache on server to ensure same reqs from different browsers
// return the same results

app.get("/", (req, resp) => {
    resp.status(200)
    resp.type('text/html')
    resp.render('index')
})


//start server

if(API_KEY) {  //if no apiKey no point loading app
    //start express and server
    app.listen(PORT, () => {
        console.info(`Application started on port ${PORT} at ${new Date()}.`)
        console.info(`with key ${API_KEY}`)
})
} else {
    console.error('API_KEY is not set')
}

//extra: check if its in cache if have then load from cache
//keep cache for 15 mins (use timestamp)
