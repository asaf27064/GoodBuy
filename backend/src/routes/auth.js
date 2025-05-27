const router=require('express').Router()
const jwt=require('jsonwebtoken')
const bcrypt=require('bcrypt')
const User=require('../Models/userModel')

router.post('/register',async(req,res)=>{
  console.log('📥 /auth/register',req.body)
  const{email,password}=req.body
  if(!email||!password)return res.status(400).end()
  if(await User.findOne({email}))return res.status(409).end()
  const passwordHash=await bcrypt.hash(password,12)
  await User.create({email,passwordHash})
  res.status(201).json({ok:true})
})

router.post('/login',async(req,res)=>{
  const{email,password}=req.body
  const u=await User.findOne({email})
  if(!u||!(await bcrypt.compare(password,u.passwordHash)))return res.status(401).end()
  const token=jwt.sign({sub:u.id},process.env.JWT_SECRET,{expiresIn:'15m'})
  res.json({token})
})

module.exports=router
