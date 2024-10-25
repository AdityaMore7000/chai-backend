import 'dotenv/config'

import connectDB from "./db/index.js";
import { app } from './app.js';
const port = process.env.PORT||3000
connectDB()
.then(()=>{
    app.on("error",(err)=>{
        console.error("Error! :",err)
    })
    app.listen(port,()=>{
        console.log(`Alive on http://localhost:${port}`)
    })
})
.catch((err)=>{
    console.error("Mongo Connection Failed! ",err)
})