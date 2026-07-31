require("dotenv").config();

const PORT=process.env.PORT;
const express=require('express');
const path = require("path");
const cors=require('cors');

const sequelize=require('./db');
require('./models');

const userRoutes=require('./routes/userRoutes');
const chatRoutes=require('./routes/chatRoutes');

const app=express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({extended:true}));

//static files
app.use(express.static(path.join(__dirname, "public")));

app.use("/css", express.static(path.join(__dirname, "css")));

app.use("/js", express.static(path.join(__dirname, "js")));

//routes
app.use("/user",userRoutes);
app.use("/chat",chatRoutes);

//home page
app.get("/",(req ,res)=>{
    res.sendFile(path.join(__dirname,"public","login.html"));
});


//database connection
sequelize.sync().then(()=>{
    console.log("Table created successfully");

    app.listen(PORT,()=>{
        console.log("Server running succcessfully ");
    });

}).catch((err)=>{
    console.log(err)
});
