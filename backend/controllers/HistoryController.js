const History = require('../models/History');

exports.getAllHistory = async (req, res) => {
  try {
    const historyRecords = await History.find().sort({ timestamp: -1 });
    res.json(historyRecords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};