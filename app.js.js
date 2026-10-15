
const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve all HTML pages from public folder
app.use(express.static(path.join(__dirname, "public")));

// Home page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 1. GET ALL PRODUCTS + SEARCH
app.get("/api/products", async (req, res) => {
    try {
        const search = String(req.query.search || "");

        const [rows] = await db.execute(
            `SELECT * FROM products
             WHERE product_name LIKE ?
             ORDER BY product_id DESC`,
            [`%${search}%`]
        );

        res.json(rows);
    } catch (error) {
        console.error("Fetch products error:", error.message);
        res.status(500).json({ error: "Unable to fetch products." });
    }
});

// 2. GET ONE PRODUCT BY ID
app.get("/api/products/:id", async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT * FROM products WHERE product_id = ?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Product not found." });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Fetch product error:", error.message);
        res.status(500).json({ error: "Unable to fetch product." });
    }
});

// 3. ADD PRODUCT
app.post("/api/products", async (req, res) => {
    try {
        const {
            product_name,
            product_price,
            product_quality,
            reorder_level
        } = req.body;

        const name = String(product_name || "").trim();
        const price = Number(product_price);
        const quality = Number(product_quality);
        const level = Number(reorder_level);

        if (
            !name ||
            name.length > 100 ||
            !Number.isFinite(price) ||
            price <= 0 ||
            !Number.isInteger(quality) ||
            quality < 0 ||
            !Number.isInteger(level) ||
            level < 0
        ) {
            return res.status(400).json({
                error: "Enter valid product name, price, stock and reorder level."
            });
        }

        const [result] = await db.execute(
            `INSERT INTO products
             (product_name, product_price, product_quality, reorder_level)
             VALUES (?, ?, ?, ?)`,
            [name, price, quality, level]
        );

        res.status(201).json({
            message: "Product added successfully.",
            product_id: result.insertId
        });
    } catch (error) {
        console.error("Add product error:", error.message);
        res.status(500).json({ error: "Unable to add product." });
    }
});

// 4. UPDATE PRODUCT
app.put("/api/products/:id", async (req, res) => {
    try {
        const {
            product_name,
            product_price,
            product_quality,
            reorder_level
        } = req.body;

        const name = String(product_name || "").trim();
        const price = Number(product_price);
        const quality = Number(product_quality);
        const level = Number(reorder_level);

        if (
            !name ||
            name.length > 100 ||
            !Number.isFinite(price) ||
            price <= 0 ||
            !Number.isInteger(quality) ||
            quality < 0 ||
            !Number.isInteger(level) ||
            level < 0
        ) {
            return res.status(400).json({
                error: "Enter valid product details."
            });
        }

        const [result] = await db.execute(
            `UPDATE products
             SET product_name = ?,
                 product_price = ?,
                 product_quality = ?,
                 reorder_level = ?
             WHERE product_id = ?`,
            [name, price, quality, level, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Product not found." });
        }

        res.json({ message: "Product updated successfully." });
    } catch (error) {
        console.error("Update product error:", error.message);
        res.status(500).json({ error: "Unable to update product." });
    }
});

// 5. DELETE PRODUCT
app.delete("/api/products/:id", async (req, res) => {
    try {
        const [result] = await db.execute(
            "DELETE FROM products WHERE product_id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Product not found." });
        }

        res.json({ message: "Product deleted successfully." });
    } catch (error) {
        console.error("Delete product error:", error.message);

        // A booking may reference this product
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                error: "This product has bookings and cannot be deleted."
            });
        }

        res.status(500).json({ error: "Unable to delete product." });
    }
});

// 6. SAVE BOOKING
app.post("/api/bookings", async (req, res) => {
    try {
        const {
            customer_name,
            phone,
            product_id,
            quantity,
            booking_date,
            notes
        } = req.body;

        const customer = String(customer_name || "").trim();
        const phoneNumber = String(phone || "").trim();
        const id = Number(product_id);
        const qty = Number(quantity);
        const date = String(booking_date || "");
        const bookingNotes = String(notes || "").trim();

        if (
            !customer ||
            customer.length > 100 ||
            !phoneNumber ||
            phoneNumber.length > 20 ||
            !Number.isInteger(id) ||
            id < 1 ||
            !Number.isInteger(qty) ||
            qty < 1 ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            bookingNotes.length > 500
        ) {
            return res.status(400).json({
                error: "Enter valid booking details."
            });
        }

        const [products] = await db.execute(
            "SELECT product_id FROM products WHERE product_id = ?",
            [id]
        );

        if (products.length === 0) {
            return res.status(404).json({
                error: "Selected product not found."
            });
        }

        const [result] = await db.execute(
            `INSERT INTO bookings
             (customer_name, phone, product_id, quantity, booking_date, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [customer, phoneNumber, id, qty, date, bookingNotes || null]
        );

        res.status(201).json({
            message: "Booking saved successfully.",
            booking_id: result.insertId
        });
    } catch (error) {
        console.error("Booking error:", error.message);
        res.status(500).json({ error: "Unable to save booking." });
    }
});

// 7. SAVE CONTACT MESSAGE
app.post("/api/contact", async (req, res) => {
    try {
        const { name, email, topic, message } = req.body;

        const contactName = String(name || "").trim();
        const contactEmail = String(email || "").trim();
        const contactTopic = String(topic || "").trim();
        const contactMessage = String(message || "").trim();

        if (
            !contactName ||
            contactName.length > 100 ||
            !contactEmail ||
            contactEmail.length > 150 ||
            !contactTopic ||
            contactTopic.length > 100 ||
            !contactMessage ||
            contactMessage.length > 2000
        ) {
            return res.status(400).json({
                error: "Please enter valid contact details."
            });
        }

        const [result] = await db.execute(
            `INSERT INTO contact_messages (name, email, topic, message)
             VALUES (?, ?, ?, ?)`,
            [contactName, contactEmail, contactTopic, contactMessage]
        );

        res.status(201).json({
            message: "Contact message saved successfully.",
            message_id: result.insertId
        });
    } catch (error) {
        console.error("Contact error:", error.message);
        res.status(500).json({ error: "Unable to save contact message." });
    }
});

// Start server only after database connection works
async function startServer() {
    try {
        await db.query("SELECT 1");

        console.log("Connected to MySQL database: charan_products_db");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("MySQL connection failed:", error.message);
        console.log("Check your db.js password, database name and MySQL service.");
        process.exitCode = 1;
    }
}

startServer();
