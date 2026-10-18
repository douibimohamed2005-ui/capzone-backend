const statsModel = require("../models/statsModel");

const getDays = (req) => {
  const d = parseInt(req.query.days);
  return [7, 30, 90].includes(d) ? d : 30;
};

exports.getOverview = (req, res) => {
  statsModel.getOverview(getDays(req), (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(r[0]);
  });
};

exports.getRevenueOverTime = (req, res) => {
  statsModel.getRevenueOverTime(getDays(req), (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(r);
  });
};

exports.getOrdersByHour = (req, res) => {
  statsModel.getOrdersByHour(getDays(req), (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(r);
  });
};

exports.getOrdersByWeekday = (req, res) => {
  statsModel.getOrdersByWeekday(getDays(req), (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(r);
  });
};

exports.getByWilaya = (req, res) => {
  statsModel.getByWilaya(getDays(req), (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(r);
  });
};

exports.getCancellationTrend = (req, res) => {
  statsModel.getCancellationTrend(getDays(req), (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(r);
  });
};

exports.getProductRevenue = (req, res) => {
  statsModel.getProductRevenue(getDays(req), (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(r);
  });
};

exports.getStockHealth = (req, res) => {
  statsModel.getStockHealth((err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(r);
  });
};
