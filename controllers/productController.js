const productModel = require("../models/productModel");
const fs = require("fs");
const path = require("path");
const db = require("../config/db");

// GET
exports.getProducts = (req, res) => {
  productModel.getAllProducts((err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// POST
exports.createProduct = (req, res) => {
  const { name, price, stock } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "Product image is required" });
  }

  const image = req.file.filename;

  if (!name || !price || !stock) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  productModel.createProduct([name, price, stock, image], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Product added successfully", productId: result.insertId });
  });
};

// DELETE — blocked if product is in any active (pending/confirmed) order
exports.deleteProduct = (req, res) => {
  const { id } = req.params;

  // 1️⃣ Check for active orders containing this product
  const checkSql = `
    SELECT COUNT(*) AS activeCount
   FROM orderitem oi
    JOIN \`order\` o ON o.id = oi.order_id
    WHERE oi.product_id = ?
      AND o.status IN ('pending', 'confirmed')
  `;

  db.query(checkSql, [id], (err, checkResult) => {
    if (err) return res.status(500).json({ error: err.message });

    const activeCount = checkResult[0].activeCount;

    if (activeCount > 0) {
      return res.status(400).json({
        message: `Cannot delete: this product is part of ${activeCount} active order${activeCount > 1 ? "s" : ""} (pending or confirmed). Wait until those orders are delivered or cancelled first.`,
        activeOrders: activeCount,
      });
    }

    // 2️⃣ Safe to delete — get product to find image
    db.query("SELECT * FROM product WHERE id = ?", [id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      if (result.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      const product = result[0];

      // 3️⃣ Delete image from uploads folder
      if (product.image) {
        const imagePath = path.join(__dirname, "..", "uploads", product.image);
        fs.unlink(imagePath, (err) => {
          if (err) console.log("⚠️ Image not deleted:", err.message);
          else console.log("✅ Image deleted:", product.image);
        });
      }

      // 4️⃣ Delete product from database
      productModel.deleteProduct(id, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Product and image deleted successfully", affectedRows: result.affectedRows });
      });
    });
  });
};

// UPDATE
exports.updateProduct = (req, res) => {
  const { id } = req.params;
  const { name, price, stock } = req.body;

  if (!name || !price || !stock) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (req.file) {
    const image = req.file.filename;
    productModel.updateProduct([name, price, stock, image, id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Product updated with new image" });
    });
  } else {
    const sql = `UPDATE product SET name = ?, price = ?, stock = ? WHERE id = ?`;
    db.query(sql, [name, price, stock, id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Product updated (image unchanged)" });
    });
  }
};
