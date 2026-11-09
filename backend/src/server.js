import express from "express"
import cors from "cors"
import "dotenv/config"
import connectDB from "./db.js"
import userRouter from "./routes/userRoutes.js"
import logger from "./middleware/Logger.js"
import cookieParser from 'cookie-parser'

const PORT = process.env.PORT || 5000
const app = express()

await connectDB()

app.use(express.json())
app.use(cors({
  origin: "http://localhost:5174", 
  credentials: true                
}));  
app.use(cookieParser());
app.use('/api/user', logger , userRouter)
app.get('/',(req,res)=>{
    res.send("API working")
})

app.use((err,req,res,next)=>{
  res.status(500).json({error:"something went wrong"})
})
app.listen(PORT , ()=>{
    console.log("Server running")
})
