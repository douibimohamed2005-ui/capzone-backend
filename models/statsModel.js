const db = require("../config/db");

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
exports.getOverview = (days, callback) => {
  const sql = `
    SELECT
      COUNT(*) AS totalOrders,
      COALESCE(SUM(total_price), 0) AS totalRevenue,
      COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_price ELSE 0 END), 0) AS deliveredRevenue,
      COALESCE(AVG(CASE WHEN status = 'delivered' THEN total_price ELSE NULL END), 0) AS avgOrderValue,
      SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
    FROM \`Order\`
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
  `;
  db.query(sql, [days], callback);
};

// ── REVENUE OVER TIME (daily) ──────────────────────────────────────────────────
exports.getRevenueOverTime = (days, callback) => {
  const sql = `
    SELECT
      DATE(created_at) AS date,
      COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_price ELSE 0 END), 0) AS revenue,
      COUNT(*) AS orders
    FROM \`Order\`
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;
  db.query(sql, [days], callback);
};

// ── ORDERS BY HOUR ─────────────────────────────────────────────────────────────
exports.getOrdersByHour = (days, callback) => {
  const sql = `
    SELECT
      HOUR(created_at) AS hour,
      COUNT(*) AS orders
    FROM \`Order\`
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY HOUR(created_at)
    ORDER BY hour ASC
  `;
  db.query(sql, [days], callback);
};

// ── ORDERS BY WEEKDAY ──────────────────────────────────────────────────────────
exports.getOrdersByWeekday = (days, callback) => {
  const sql = `
    SELECT
      DAYOFWEEK(created_at) AS dayNum,
      DAYNAME(created_at) AS dayName,
      COUNT(*) AS orders,
      COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_price ELSE 0 END), 0) AS revenue
    FROM \`Order\`
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY DAYOFWEEK(created_at), DAYNAME(created_at)
    ORDER BY dayNum ASC
  `;
  db.query(sql, [days], callback);
};

// ── BY WILAYA ──────────────────────────────────────────────────────────────────
exports.getByWilaya = (days, callback) => {
  const sql = `
    SELECT
      COALESCE(w.name, 'Unknown') AS wilaya,
      COUNT(*) AS orders,
      COALESCE(SUM(o.total_price), 0) AS revenue,
      COALESCE(AVG(o.total_price), 0) AS avgOrder
    FROM \`Order\` o
    LEFT JOIN \`Wilaya\` w ON w.id = o.wilaya_id
    WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      AND o.status != 'cancelled'
    GROUP BY o.wilaya_id, w.name
    ORDER BY revenue DESC
    LIMIT 15
  `;
  db.query(sql, [days], callback);
};

// ── CANCELLATION RATE OVER TIME ────────────────────────────────────────────────
exports.getCancellationTrend = (days, callback) => {
  const sql = `
    SELECT
      DATE(created_at) AS date,
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered
    FROM \`Order\`
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;
  db.query(sql, [days], callback);
};

// ── PRODUCT REVENUE ────────────────────────────────────────────────────────────
exports.getProductRevenue = (days, callback) => {
  const sql = `
    SELECT
      p.id,
      p.name,
      p.price AS unitPrice,
      p.stock,
      COALESCE(SUM(oi.quantity), 0) AS totalSold,
      COALESCE(SUM(oi.quantity * oi.price), 0) AS totalRevenue
    FROM Product p
    LEFT JOIN OrderItem oi ON oi.product_id = p.id
    LEFT JOIN \`Order\` o ON o.id = oi.order_id
      AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      AND o.status != 'cancelled'
    GROUP BY p.id, p.name, p.price, p.stock
    ORDER BY totalRevenue DESC
  `;
  db.query(sql, [days], callback);
};

// ── STOCK HEALTH ───────────────────────────────────────────────────────────────
exports.getStockHealth = (callback) => {
  const sql = `
    SELECT
      id, name, stock, price,
      CASE
        WHEN stock = 0      THEN 'out'
        WHEN stock <= 5     THEN 'low'
        WHEN stock <= 20    THEN 'medium'
        ELSE                     'healthy'
      END AS health
    FROM Product
    ORDER BY stock ASC
  `;
  db.query(sql, callback);
};
