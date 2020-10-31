//import required libraries
const express = require('express')
const handlebars = require('express-handlebars')
const withQuery = require('with-query').default
const fetch = require('node-fetch')

//config PORT & API_KEY & URL
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000;
const API_KEY = process.env.API_KEY || 'db1b2301dbe54a779f1579bb4e54cf57'
const URL = "https://newsapi.org/v2/top-headlines"

const app = express()

//config handlebars
app.engine('hbs', handlebars({defaultLayout: 'default.hbs'}))
app.set('view engine', 'hbs')

app.use(express.static(__dirname + '/static')) //for static folders later

const cleaned = (dataArr) => {
    const dataset = []
    for (let article of dataArr.articles) {
        const title = article['title']
        const pubTime = article['publishedAt']
        const url = article['url']
        const image = article['urlToImage'] 
        const summary = article['description']
        dataset.push({title, image, summary, pubTime, url })
    }
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
            // pageSize: 12
        })
        console.info(`fullURL: `, fullURL)
        const result = await fetch(fullURL)

        //to use apiKey in http header to access instead of storing as a variable separately
        /* 
        const headers = {
            "x-Api-key": "876JHG76UKFJYGVHf867rFUTFGHCJ8JHV"
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

        const p = await result.json()
        
        const dataset = cleaned(p) //arr of result articles
        console.info('results array cleaned: ', dataset)

        const cacheData = JSON.parse(data.cacheState) //JSON obj
        console.info('cacheData: ', cacheData)
        /* const index = [searchKey, searchCountry, searchCategory].join(",") //use string as Index    
        if (!cacheData[index] || cacheData[index] !== dataset) {
        cacheData.push({
            [searchKey+searchCountry, searchCategory]: dataset }
                }
            }
        )
        } else {
            dataset = cacheData['q']['country']['category']
        } */
        resp.status(200)
        resp.type('text/html')
        resp.render('results', 
            {
                dataset: dataset, 
                searchTerm: searchKey,
                cacheState: cacheData,
                noContent: !dataset.length
            })

        
})


app.get("/", (req, resp) => {
    const cacheCart = [] //create cacheState for future retrieval
    resp.status(200)
    resp.type('text/html')
    resp.render('index', {
        cacheState: JSON.stringify(cacheCart)
    })
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