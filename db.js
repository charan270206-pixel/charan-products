
const mysql = require("mysql2/promise");

const db = mysql.createPool({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "charan@123",
    database: "charan_products_db"
});

async function testConnection() {
    try {
        const connection = await db.getConnection();
        console.log("MySQL connected successfully!");
        connection.release();
    } catch (error) {
        console.log("MySQL connection failed:", error.message);
    }
}

testConnection();

module.exports = db;
