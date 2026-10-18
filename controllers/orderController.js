const orderModel = require("../models/orderModel");

// CREATE ORDER
exports.createOrder = (req, res) => {
  // Now expects wilaya_id and commune_id (integers) instead of plain strings
  const { client_name, client_phone, wilaya_id, commune_id, address, items } = req.body;

  if (!client_name || !client_phone || !items || items.length === 0) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!wilaya_id) {
    return res.status(400).json({ message: "wilaya_id is required" });
  }

  let total_price = 0;
  let processed = 0;
  const values = [];
  const stockIssues = [];

  items.forEach((item) => {
    orderModel.getProductById(item.product_id, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.status(400).json({ message: "Product not found" });
      }

      const product = results[0];

      if (product.stock < item.quantity) {
        stockIssues.push({
          product_id: item.product_id,
          available: product.stock,
          requested: item.quantity,
        });
      }

      total_price += product.price * item.quantity;
      values.push([null, item.product_id, item.quantity, product.price]);
      processed++;

      if (processed === items.length) {
        if (stockIssues.length > 0) {
          return res.status(400).json({
            message: "Some products have limited stock",
            issues: stockIssues,
          });
        }

        // Pass wilaya_id and commune_id (integers) — matches new Order schema
        orderModel.createOrder([client_name, client_phone, wilaya_id, commune_id, address, total_price], (err, result) => {
          if (err) return res.status(500).json({ error: err.message });

          const orderId = result.insertId;
          const finalValues = values.map((v) => [orderId, v[1], v[2], v[3]]);

          orderModel.insertOrderItems(finalValues, (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });

            // Deduct stock for each ordered product
            finalValues.forEach((item) => {
              orderModel.updateStock(item[1], item[2], () => {});
            });

            res.json({ message: "Order created successfully", orderId, total_price });
          });
        });
      }
    });
  });
};

// GET ALL ORDERS
exports.getOrders = (req, res) => {
  orderModel.getAllOrders((err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// GET ORDER DETAILS
exports.getOrderDetails = (req, res) => {
  const id = req.params.id;

  orderModel.getOrderById(id, (err, order) => {
    if (err) return res.status(500).json({ error: err.message });

    if (order.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    orderModel.getOrderItems(id, (err2, items) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ order: order[0], items });
    });
  });
};

// UPDATE STATUS — restores stock when cancelling
exports.updateStatus = (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  const allowed = ["pending", "confirmed", "delivered", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  // 1️⃣ Read current status before applying change
  orderModel.getOrderById(id, (err, orderRows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (orderRows.length === 0) return res.status(404).json({ message: "Order not found" });

    const currentStatus = orderRows[0].status;

    // 2️⃣ Guard against double-cancel (prevents double stock restore)
    if (currentStatus === "cancelled" && status === "cancelled") {
      return res.json({ message: "Order is already cancelled" });
    }

    // 3️⃣ Apply status update
    orderModel.updateOrderStatus(status, id, (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // 4️⃣ If transitioning to cancelled → restore stock for every item
      if (status === "cancelled" && currentStatus !== "cancelled") {
        orderModel.getOrderItems(id, (err2, items) => {
          if (err2) {
            console.error("⚠️ Stock restore failed — could not fetch items:", err2.message);
            return res.json({
              message: "Order cancelled. Stock restore encountered an error — check logs.",
            });
          }

          items.forEach((item) => {
            orderModel.restoreStock(item.product_id, item.quantity, (err3) => {
              if (err3) console.error(`⚠️ Stock restore failed for product ${item.product_id}:`, err3.message);
              else console.log(`✅ Stock restored: product ${item.product_id} +${item.quantity}`);
            });
          });

          res.json({ message: "Order cancelled and stock restored successfully" });
        });
      } else {
        res.json({ message: "Order status updated" });
      }
    });
  });
};
