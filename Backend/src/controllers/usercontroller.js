import httpStatus from "http-status";
import { User } from "../models/usermodel.js";
import { Meeting } from "../models/meetingmodel.js";
import bcrypt , {hash} from "bcrypt"




 

import crypto from "crypto";

const login = async(req,res) => {

  const {username ,  password} = req.body;

  if(!username || ! password){
    return res.status(400).json({message : "Please provide"})
  }
  try{
    const user = await User.findOne({username});
    if(!user) {
      return res.status(httpStatus.NOT_FOUND).json({message : "User not found"});
    }

    let isPassword = await bcrypt.compare(password , user.password)

     if(isPassword){
      let token  = crypto.randomBytes(20).toString("hex");

      user.token  =token;

      await user.save();
      return res.status(httpStatus.OK).json({token : token, role: user.role, name: user.name})
     }  else{
      return res.status(httpStatus.UNAUTHORIZED).json({message : "invalid user name or password"})
     }

  }
  catch(e){

    return res.status(500).json({message: `Somethong went wrong ${e}`})

  }
}

const register = async(req,res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ message: "Invalid request: body missing or malformed" });
  }
  const { name , username , password, role}=  req.body ;

  try{
      const existingUser = await User.findOne({username});
      if(existingUser){
        return res.status(httpStatus.FOUND).json({message : "User already exists"})
      }
      const hashedPassword = await bcrypt.hash(password,10);

       const newUser = new User ({
        name : name,
        username: username,
        password : hashedPassword,
        role: role || 'Customer'
       })

       await newUser.save();

       res.status(httpStatus.CREATED).json({message : "User Registered"})
  } catch (e) {
    res.json({message : `Something went wrong ${e}`})
       
  }
}

const getAllSessions = async (req, res) => {
    try {
        const sessions = await Meeting.find().sort({ startTime: -1 });
        return res.status(httpStatus.OK).json(sessions);
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` });
    }
}

const getMetrics = async (req, res) => {
    try {
        const totalSessions = await Meeting.countDocuments();
        const activeSessions = await Meeting.countDocuments({ status: 'Active' });
        const totalUsers = await User.countDocuments();
        return res.status(httpStatus.OK).json({ totalSessions, activeSessions, totalUsers });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` });
    }
}

export { login, register, getAllSessions, getMetrics };