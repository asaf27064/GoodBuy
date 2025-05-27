const router=require('express').Router()
const jwt=require('jsonwebtoken')
const User=require('../Models/userModel')

router.post('/register',async(req,res)=>{
  const{email,password}=req.body
  await User.create({email,passwordHash:password})
  res.json({ok:true})
})

router.post('/login',async(req,res)=>{
  const{email,password}=req.body
  const u=await User.findOne({email})
  if(!u||!(await u.verifyPassword(password)))return res.status(401).end()
  const token=jwt.sign({sub:u.id},process.env.JWT_SECRET,{expiresIn:'15m'})
  res.json({token})
})

module.exports=router
