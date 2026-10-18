const db = require('./config/db'); db.query('SELECT DISTINCT status FROM `Order`', (err, res) => { console.log(err || res); process.exit(); });
