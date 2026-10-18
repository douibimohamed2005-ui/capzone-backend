const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET ALL WILAYAS
// Returns: [{ id, name }, ...]
router.get("/wilayas", (req, res) => {
  db.query("SELECT id, name FROM `Wilaya` ORDER BY name ASC", (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// GET COMMUNES BY WILAYA
// Query param: wilaya_id (integer)
// Returns: [{ id, commune }, ...]
router.get("/communes", (req, res) => {
  const { wilaya_id } = req.query;

  if (!wilaya_id) return res.status(400).json({ message: "wilaya_id is required" });

  db.query("SELECT id, commune FROM `Commune` WHERE wilaya_id = ? ORDER BY commune ASC", [wilaya_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// GET DELIVERY PRICE
// Query params: wilaya_id (integer), type ("stopdesk" | "domicile")
// Returns: { price }
router.get("/price", (req, res) => {
  const { wilaya_id, type } = req.query;

  if (!wilaya_id) return res.status(400).json({ message: "wilaya_id is required" });

  const column = type === "stopdesk" ? "price_stopdesk" : "price_domicile";

  db.query(`SELECT ${column} AS price FROM \`Delivery\` WHERE wilaya_id = ?`, [wilaya_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.length === 0) {
      return res.status(404).json({ message: "Delivery price not found for this wilaya" });
    }

    res.json({ price: result[0].price });
  });
});

module.exports = router;
