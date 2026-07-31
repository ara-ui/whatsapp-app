const User=require('../models/User');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const { hash } = require('node:crypto');
const {Op}=require('sequelize');

function generateAccessToken(id,name){

    return jwt.sign(
        {
            userId:id,
            name:name
        },
        process.env.JWT_SECRET,
        {
            expiresIn:"1d"
        }
    );
}

//signup

const createUser=async (req,res)=>{

    try{

        const {name,email,phone,password}=req.body;

        if(!name || !email|| !phone|| !password){
            return res.status(400).json({
                message:"All fields are required"
            });
        }

        const existingUser=await User.findOne({

            where:{
                [Op.or]:[
                    {email},
                    {phone}
                ]
            }
        });

        if(existingUser){
            return res.status(409).json({
                message:"User already exists"
            });
        }

         bcrypt.hash(password,10,async(err,hash)=>{

            if (err){
                return res.status(500).json({
                    success:false,
                    message:"Something went wrong"
                });
            }

            const user=await User.create({
            name,
            email,
            phone,
            password:hash
        });

        res.status(201).json({
            success:true,
            message:"signup successful"
        });

     });
  
    }
    catch(err){
        res.status(500).json({
            success:false,
            message:err.message,
        });
    }
}

//login user

const loginUser=async (req,res)=>{
    try{

        const{emailOrPhone,password}=req.body;

        const user=await User.findOne({

            where:{
                [Op.or]:[
                    {
                        email:emailOrPhone
                    },{
                        phone:emailOrPhone
                    }
                ]
            }
        });

        if(!user){
            return res.status(404).json({
                success:false,
                message:"User not found"
            });
        }



        bcrypt.compare(password,user.password,(err,result)=>{

            if(err){

                return res.status(500).json({
                    message:"Something went wrong"
                });

            }

            if(!result){

                return res.status(401).json({
                    message:"Incorrect password"
                });

            }

            const token=generateAccessToken(user.id,user.name);

            res.status(200).json({

                success:true,

                token

            });

         });
    }catch(err){
        res.status(500).json({
            message:err.message
        });
    }
}

module.exports={
    createUser,loginUser
}