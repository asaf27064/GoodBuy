// File: service/historyService.js

const Purchase = require('../Models/Purchase');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Fetch the last N purchases for a given userId.
 * Returns an array of objects: [{ date: Date, items: [<itemName>] }, ...].
 */
async function getUserDetailedHistory(userId, limit = 15) {
  // Pull Purchase docs, sort by timestamp descending, limit to N
  const purchases = await Purchase.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('items.priceItemId', 'itemName') // Populate only itemName from PriceItem
    .lean();

  // Convert to an array of { date, items: [<itemName>] }
  return purchases.map(p => ({
    date: p.timestamp,
    items: p.items.map(i => i.priceItemId.itemName)
  }));
}

/**
 * Analyze frequency and weekly patterns given detailedHistory.
 * Input: detailedHistory = [{ date: Date, items: [<itemName>] }, ...]
 * Output:
 *   - frequencyMap: { [itemName]: totalCount }
 *   - weekdayMap:   { [itemName]: { Sunday: count, ..., Saturday: count } }
 */
function analyzeFrequencyAndWeeklyPattern(detailedHistory) {
  const frequencyMap = {};
  const weekdayMap = {};

  for (const purchase of detailedHistory) {
    const dateObj = new Date(purchase.date);
    const weekday = WEEKDAYS[dateObj.getDay()]; // getDay(): 0=Sunday ...6=Saturday

    for (const itemName of purchase.items) {
      frequencyMap[itemName] = (frequencyMap[itemName] || 0) + 1;

      if (!weekdayMap[itemName]) {
        weekdayMap[itemName] = {
          Sunday: 0,
          Monday: 0,
          Tuesday: 0,
          Wednesday: 0,
          Thursday: 0,
          Friday: 0,
          Saturday: 0
        };
      }
      weekdayMap[itemName][weekday]++;
    }
  }

  return { frequencyMap, weekdayMap };
}

module.exports = {
  getUserDetailedHistory,
  analyzeFrequencyAndWeeklyPattern
};
