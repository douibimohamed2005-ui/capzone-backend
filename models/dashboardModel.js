const db = require("../config/db");

// TOTAL PRODUCTS
exports.getTotalProducts = (callback) => {
  db.query("SELECT COUNT(*) AS totalProducts FROM `Product`", callback);
};

// TOTAL ORDERS
exports.getTotalOrders = (callback) => {
  db.query("SELECT COUNT(*) AS totalOrders FROM `Order`", callback);
};

// TOTAL REVENUE (delivered orders only)
exports.getTotalRevenue = (callback) => {
  db.query("SELECT SUM(total_price) AS totalRevenue FROM `Order` WHERE status = 'delivered'", callback);
};

// RECENT ORDERS — JOIN Wilaya and Commune to return names for the dashboard table
exports.getRecentOrders = (callback) => {
  const sql = `
    SELECT
      o.id,
      o.client_name,
      o.client_phone,
      o.wilaya_id,
      o.commune_id,
      w.name    AS wilaya,
      c.commune,
      o.total_price,
      o.status,
      o.created_at
    FROM \`Order\` o
    LEFT JOIN \`Wilaya\`  w ON w.id = o.wilaya_id
    LEFT JOIN \`Commune\` c ON c.id = o.commune_id
    ORDER BY o.id DESC
    LIMIT 5
  `;
  db.query(sql, callback);
};

// ORDERS BY STATUS
exports.getOrdersByStatus = (callback) => {
  db.query("SELECT status, COUNT(*) AS count FROM `Order` GROUP BY status", callback);
};

// BEST SELLING PRODUCTS
exports.getBestSellingProducts = (callback) => {
  db.query(
    `SELECT p.id, p.name, SUM(oi.quantity) AS totalSold
     FROM OrderItem oi
     JOIN \`Product\` p ON oi.product_id = p.id
     GROUP BY p.id, p.name
     ORDER BY totalSold DESC
     LIMIT 5`,
    callback,
  );
};
