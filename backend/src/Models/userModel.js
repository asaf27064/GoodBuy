const mongoose=require('mongoose')
const bcrypt=require('bcrypt')

const userSchema=new mongoose.Schema(
  {
    email:{type:String,required:true,unique:true,lowercase:true},
    passwordHash:{type:String,required:true},
    username:{type:String,unique:true,sparse:true},
    location:{type:String,default:''}
  },
  {timestamps:true}
)

userSchema.methods.verifyPassword=function(p){return bcrypt.compare(p,this.passwordHash)}
userSchema.pre('save',async function(){if(this.isModified('passwordHash'))return;this.passwordHash=await bcrypt.hash(this.passwordHash,12)})

module.exports=mongoose.model('User',userSchema)