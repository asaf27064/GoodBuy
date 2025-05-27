const jwt=require('jsonwebtoken')
module.exports=(req,res,next)=>{
  const h=req.headers.authorization||''
  const t=h.split(' ')[1]
  try{req.user=jwt.verify(t,process.env.JWT_SECRET);next()}catch{res.status(401).end()}
}
