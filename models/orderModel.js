const db = require("../config/db");

// GET product (price + stock)
exports.getProductById = (id, callback) => {
  db.query("SELECT price, stock FROM `Product` WHERE id = ?", [id], callback);
};

// CREATE ORDER — now uses wilaya_id and commune_id (integers)
exports.createOrder = (data, callback) => {
  const sql = `
    INSERT INTO \`Order\`
      (client_name, client_phone, wilaya_id, commune_id, address, total_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, data, callback);
};

// INSERT ORDER ITEMS
exports.insertOrderItems = (values, callback) => {
  const sql = `
    INSERT INTO OrderItem (order_id, product_id, quantity, price)
    VALUES ?
  `;
  db.query(sql, [values], callback);
};

// DEDUCT STOCK (when order is created)
exports.updateStock = (product_id, quantity, callback) => {
  db.query("UPDATE `Product` SET stock = stock - ? WHERE id = ?", [quantity, product_id], callback);
};

// RESTORE STOCK (when order is cancelled)
exports.restoreStock = (product_id, quantity, callback) => {
  db.query("UPDATE `Product` SET stock = stock + ? WHERE id = ?", [quantity, product_id], callback);
};

// GET ALL ORDERS — JOIN Wilaya and Commune to return names instead of IDs
exports.getAllOrders = (callback) => {
  const sql = `
    SELECT
      o.id,
      o.client_name,
      o.client_phone,
      o.wilaya_id,
      o.commune_id,
      w.name  AS wilaya,
      c.commune,
      o.address,
      o.total_price,
      o.status,
      o.created_at
    FROM \`Order\` o
    LEFT JOIN \`Wilaya\`  w ON w.id = o.wilaya_id
    LEFT JOIN \`Commune\` c ON c.id = o.commune_id
    ORDER BY o.id DESC
  `;
  db.query(sql, callback);
};

// GET SINGLE ORDER BY ID — same JOINs so the detail modal gets names too
exports.getOrderById = (id, callback) => {
  const sql = `
    SELECT
      o.id,
      o.client_name,
      o.client_phone,
      o.wilaya_id,
      o.commune_id,
      w.name  AS wilaya,
      c.commune,
      o.address,
      o.total_price,
      o.status,
      o.created_at
    FROM \`Order\` o
    LEFT JOIN \`Wilaya\`  w ON w.id = o.wilaya_id
    LEFT JOIN \`Commune\` c ON c.id = o.commune_id
    WHERE o.id = ?
  `;
  db.query(sql, [id], callback);
};

// GET ORDER ITEMS — includes product name and image for frontend thumbnails
exports.getOrderItems = (id, callback) => {
  const sql = `
    SELECT oi.*, p.name, p.image
    FROM OrderItem oi
    JOIN \`Product\` p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `;
  db.query(sql, [id], callback);
};

// UPDATE ORDER STATUS
exports.updateOrderStatus = (status, id, callback) => {
  db.query("UPDATE `Order` SET status = ? WHERE id = ?", [status, id], callback);
};
