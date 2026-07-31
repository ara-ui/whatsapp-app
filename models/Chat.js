const {DataTypes}=require('sequelize');
const db=require('../db');

const Chat = db.define("chat", {

    id:{
        type:DataTypes.INTEGER,
        autoIncrement:true,
        allowNull:false,
        primaryKey:true
    },

    message:{
        type:DataTypes.STRING,
        allowNull:false
    }

});

module.exports=Chat;