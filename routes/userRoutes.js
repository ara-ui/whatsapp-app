const express=require('express');
const router=express.Router();

const {createUser,loginUser,checkUser}=require("../controller/userController");

router.post("/signup",createUser);

router.post("/login",loginUser);

router.get("/check-user",checkUser);


module.exports=router;
