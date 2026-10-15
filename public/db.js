
const mysql = require("mysql2/promise");

const db = mysql.createPool({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "charan@123",
    database: "charan_products_db",
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = db;
