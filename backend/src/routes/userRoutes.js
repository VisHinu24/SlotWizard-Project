import express from "express"
import {registerUser,loginUser,createTableForUser,getTimetables,getSubjects,logoutUser,loggedIn,editProfile,changePassword,saveTimetable,getPreferences,updatePreferences} from '../controllers/userController.js'
import {verifyToken} from '../middleware/authMiddleware.js'
const userRouter = express.Router()

userRouter.post('/register',registerUser)
userRouter.post('/login',loginUser)
userRouter.get('/logout',verifyToken,logoutUser) 
userRouter.post('/timetables',verifyToken, createTableForUser)
userRouter.get('/timetables',verifyToken, getTimetables)
userRouter.post('/timetables/save',verifyToken, saveTimetable)
userRouter.get('/subjects',getSubjects)
userRouter.get('/loggedin',verifyToken,loggedIn)
userRouter.put('/profile',verifyToken,editProfile)
userRouter.put('/password',verifyToken,changePassword)
userRouter.get('/preferences',verifyToken,getPreferences)
userRouter.put('/preferences',verifyToken,updatePreferences)

export default userRouter
