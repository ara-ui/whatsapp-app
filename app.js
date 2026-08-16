require("dotenv").config();

const PORT=process.env.PORT;
const express=require('express');
const path = require("path");
const cors=require('cors');
const http=require('http');


const initializeSocket = require("./socket-io");

const sequelize=require('./db');
require('./models');

const userRoutes=require('./routes/userRoutes');
const chatRoutes=require('./routes/chatRoutes');
const roomRoutes=require('./routes/roomRoutes');
const messageRoutes=require('./routes/messageRoutes');
const mediaRoutes=require('./routes/mediaRoutes');

const app=express();
const server=http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Makes io reachable from REST controllers via req.app.get("io") —
// needed so POST /media/upload can broadcast into a room the same
// way the Socket.IO room handler does for text messages.
app.set("io", io);


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
app.use("/rooms",roomRoutes);
app.use("/rooms",messageRoutes);
app.use("/media",mediaRoutes);

//home page
app.get("/",(req ,res)=>{
    res.sendFile(path.join(__dirname,"public","login.html"));
});




//database connection
sequelize.sync().then(()=>{
    console.log("Table created successfully");

    server.listen(PORT,()=>{
        console.log("Server running succcessfully ");
    });

}).catch((err)=>{
    console.log(err)
});
