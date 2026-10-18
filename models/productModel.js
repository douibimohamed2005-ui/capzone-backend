const db = require("../config/db");

// GET
exports.getAllProducts = (callback) => {
  db.query("SELECT * FROM Product", callback);
};

// CREATE
exports.createProduct = (data, callback) => {
  const sql = `
    INSERT INTO Product (name, price, stock, image)
    VALUES (?, ?, ?, ?)
  `;
  db.query(sql, data, callback);
};

// DELETE
exports.deleteProduct = (id, callback) => {
  db.query("DELETE FROM Product WHERE id = ?", [id], callback);
};

// UPDATE
exports.updateProduct = (data, callback) => {
  const sql = `
    UPDATE Product 
    SET name = ?, price = ?, stock = ?, image = ?
    WHERE id = ?
  `;
  db.query(sql, data, callback);
};
//get product by id to delete the image from uplaod folder when a product deleted
exports.deleteProduct = (id, callback) => {
  const sql = "DELETE FROM Product WHERE id = ?";
  db.query(sql, [id], callback);
};
