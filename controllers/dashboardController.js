const dashboardModel = require("../models/dashboardModel");

// GET DASHBOARD STATS
exports.getDashboard = (req, res) => {
  const stats = {};

  dashboardModel.getTotalProducts((err, r1) => {
    if (err) return res.status(500).json({ error: err.message });

    stats.totalProducts = r1[0].totalProducts;

    dashboardModel.getTotalOrders((err, r2) => {
      if (err) return res.status(500).json({ error: err.message });

      stats.totalOrders = r2[0].totalOrders;

      dashboardModel.getTotalRevenue((err, r3) => {
        if (err) return res.status(500).json({ error: err.message });

        stats.totalRevenue = r3[0].totalRevenue || 0;

        dashboardModel.getRecentOrders((err, r4) => {
          if (err) return res.status(500).json({ error: err.message });

          stats.recentOrders = r4;

          dashboardModel.getOrdersByStatus((err, r5) => {
            if (err) return res.status(500).json({ error: err.message });

            stats.ordersByStatus = r5;

            dashboardModel.getBestSellingProducts((err, r6) => {
              if (err) return res.status(500).json({ error: err.message });

              stats.bestSellingProducts = r6;

              // ✅ FINAL RESPONSE
              res.json(stats);
            });
          });
        });
      });
    });
  });
};
