import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      default: null,
    },
    /*googleId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },*/

    profileImage: {
      type: String,
      default: "",
    },

    phoneNumber: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      maxlength: 150,
      default: "",
    },

    onlineStatus: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken:{
      type: String
    }
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save",async function (next) {
    if(!this.isModified("password")) return;
    this.password=await bcrypt.hash(this.password,10)
    ;
})

userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function () {
    
    return jwt.sign(
    {
        id:this._id,
        username:this.username,
        email:this.email,

    },
    process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRE
        }
    )
}

userSchema.methods.generateRefreshToken=function(){
  
    return jwt.sign({
        _id:this.id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRE
    }
)
}

const User = mongoose.model("User", userSchema);

export default User;