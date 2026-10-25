
const express = require("express");
const cors = require("cors");
require("dotenv").config();

//  this line import the database file
const db = require("./config/db");
const productRoutes = require("./routes/productRoutes"); // connect routes with server.js
const adminRoutes = require("./routes/adminRoutes");
const orderRoutes = require("./routes/orderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes"); //delivery wilayas and commune prices
const statsRoutes = require("./routes/statsRoutes"); // statistics
const chatbotRoutes = require("./routes/chatbotRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/products", productRoutes); //connect routes with server.js
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/uploads", express.static("uploads")); // admin upload images
app.use("/api/delivery", deliveryRoutes); // delivery
app.use("/api/stats", statsRoutes);
app.use("/api/chatbot", chatbotRoutes);

app.get("/", (req, res) => res.send("API is working 🚀 hhh younes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
