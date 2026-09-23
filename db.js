require("dotenv").config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: "postgres",

        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },

        // Keep SQL output quiet during normal development.
        // Set DEBUG_SQL=true when investigating a database/query issue.
        logging: process.env.DEBUG_SQL === "true" ? console.log : false
    }
);

sequelize.authenticate()
    .then(() => console.log("Database connected"))
    .catch((err) => console.log(err));

module.exports = sequelize;