require("dotenv").config();

const PORT=process.env.PORT;

const express=require('express');


const path = require("path");
const cors=require('cors');

const sequelize=require('./db');
require('./models/User');
const userRoutes=require('./routes/userRoutes');

const app=express();
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname)));
app.use("/user",userRoutes);


sequelize.sync().then(()=>{
    console.log("Table created successfully");

    app.listen(PORT,()=>{
        console.log("Server running succcessfully ");
    });

}).catch((err)=>{
    console.log(err)
});
