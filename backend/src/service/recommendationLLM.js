// File: service/recommendationLLM.js

const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const {
  getUserDetailedHistory,
  analyzeFrequencyAndWeeklyPattern
} = require('./historyService');

/**
 * Build the prompt text that includes:
 * 1. The last N purchases (with dates and item names).
 * 2. A summary of top 3 frequent items.
 * 3. Any clear weekly patterns (item bought ≥2 times on same weekday).
 * 4. Final instruction: “Recommend 5 grocery items...”
 */
function buildPromptWithPatterns(detailedHistory, frequencyMap, weekdayMap) {
  // Part 1: List the recent purchases
  const purchaseLines = detailedHistory
    .map((p, idx) => {
      const dateStr = new Date(p.date).toISOString().split('T')[0]; // "YYYY-MM-DD"
      return `- Purchase #${idx + 1} (${dateStr}): ${p.items.join(', ')}`;
    })
    .join('\n');

  // Part 2: Top 3 frequent items
  const sortedByFreq = Object.entries(frequencyMap)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3); // take top 3
  const freqLines = sortedByFreq
    .map(([item, count]) => `- ${item} was purchased ${count} times in the last ${detailedHistory.length} purchases.`)
    .join('\n');

  // Part 3: Weekly patterns (≥2 purchases on same weekday)
  const periodicityLines = [];
  for (const [item, weekdays] of Object.entries(weekdayMap)) {
    for (const [day, cnt] of Object.entries(weekdays)) {
      if (cnt >= 2) {
        periodicityLines.push(`- ${item} was bought ${cnt} times on ${day}s.`);
      }
    }
  }
  const periodicityText = periodicityLines.length
    ? periodicityLines.join('\n')
    : '- No clear weekly pattern identified.';

  // Part 4: Instruction for the LLM
  const footer = `
Based on the above purchase history, purchase frequencies, and weekly patterns, recommend 5 grocery items the user is most likely to buy next. List only the item names separated by commas.
`;

  return `
User purchase history (last ${detailedHistory.length} entries):
${purchaseLines}

Frequent purchases summary:
${freqLines}

Weekly purchase patterns:
${periodicityText}

${footer}
`;
}

/**
 * Fetch and return up to 5 item names recommended by the LLM,
 * taking into account time patterns from the user’s purchase history.
 */
async function getRecommendationsWithTimePatterns(userId) {
  // 1. Get up to 15 recent purchases
  const detailedHistory = await getUserDetailedHistory(userId, 15);
  if (detailedHistory.length === 0) {
    // Cold start: return empty array (caller can fallback to “popular items”)
    return [];
  }

  // 2. Compute frequency & weekday patterns
  const { frequencyMap, weekdayMap } = analyzeFrequencyAndWeeklyPattern(detailedHistory);

  // 3. Build the prompt string
  const prompt = buildPromptWithPatterns(detailedHistory, frequencyMap, weekdayMap);

  // 4. Call OpenAI’s chat completion endpoint
  const response = await openai.chat.completions.create({
    model: 'gpt-4o', // or 'gpt-3.5-turbo' if you don’t have GPT-4 access
    messages: [
      { role: 'system', content: 'You are a grocery shopping recommendation engine.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 150
  });

  // 5. Parse response as comma-separated item names
  const text = response.choices[0].message.content.trim();
  const recommendedItems = text
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);

  return recommendedItems; // e.g. ["Butter", "Yogurt", "Cereal", "Orange Juice", "Jam"]
}

module.exports = { getRecommendationsWithTimePatterns };
