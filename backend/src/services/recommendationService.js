// backend/src/services/recommendationService.js

const PurchaseModel = require('../models/purchaseModel')

/**
 * Enhanced recommender with habit, co-occurrence, personal, global popularity, and novelty slots
 */
module.exports = {
  recommend: async (userId, currentProducts, purchaseHistory, topN = 5) => {
    const now = new Date()
    const todayWd = now.getDay()
    const currentCodes = new Set(currentProducts.map(p => p.product.itemCode))

    // 1) Recency-frequency scores
    const λ = 0.000001
    const userScores = {}
    purchaseHistory.forEach(basket => {
      const age = now - new Date(basket.timeStamp).getTime()
      const decay = Math.exp(-λ * age)
      basket.products.forEach(({ product, numUnits }) => {
        const code = product.itemCode
        userScores[code] = (userScores[code] || 0) + decay * numUnits
      })
    })

    // 2) Habit candidates
    const minHabits = 4
    const weekdayCounts = {}
    purchaseHistory.forEach(basket => {
      const wd = new Date(basket.timeStamp).getDay()
      basket.products.forEach(({ product }) => {
        const code = product.itemCode
        weekdayCounts[code] = weekdayCounts[code] || {}
        weekdayCounts[code][wd] = (weekdayCounts[code][wd] || 0) + 1
      })
    })
    const habitCandidates = Object.entries(weekdayCounts)
      .filter(([code, counts]) => !currentCodes.has(code) && (counts[todayWd] || 0) >= minHabits)
      .map(([code, counts]) => ({
        code,
        score: counts[todayWd] * 10 + (userScores[code] || 0),
        method: 'habit'
      }))

    // 3) Co-occurrence candidates
    const coCounts = {}
    purchaseHistory.forEach(basket => {
      const codes = basket.products.map(p => p.product.itemCode)
      if (!codes.some(c => currentCodes.has(c))) return
      codes.forEach(c => {
        if (!currentCodes.has(c)) coCounts[c] = (coCounts[c] || 0) + 1
      })
    })
    const α = 0.5
    let coCandidates = Object.entries(coCounts)
      .filter(([code]) => !currentCodes.has(code))
      .map(([code, co]) => ({
        code,
        score: co * (1 + α * (userScores[code] || 0)),
        method: 'co-occurrence'
      }))

    // 4) Personal candidates
    let personalCandidates = Object.entries(userScores)
      .filter(([code]) => !currentCodes.has(code))
      .map(([code, uf]) => ({ code, score: uf, method: 'personal' }))

    // 5) Global popularity boost
    const globalAgg = await PurchaseModel.aggregate([
      { $unwind: '$products' },
      { $group: { _id: '$products.product.itemCode', count: { $sum: 1 } } }
    ])
    const maxCount = Math.max(...globalAgg.map(g => g.count), 1)
    const globalCounts = Object.fromEntries(globalAgg.map(g => [g._id, g.count]))
    const boostRatio = 0.05
    const applyGlobalBoost = list =>
      list.map(item => ({
        ...item,
        score: item.score + ((globalCounts[item.code] || 0) / maxCount) * boostRatio * item.score
      }))
    coCandidates = applyGlobalBoost(coCandidates)
    personalCandidates = applyGlobalBoost(personalCandidates)

    // 6) Merge in priority with novelty
    const merged = []
    const addUnique = list => {
      for (const x of list) {
        if (merged.find(m => m.code === x.code)) continue
        merged.push(x)
        if (merged.length === topN) break
      }
    }
    // novelty slot
    const noveltyPool = personalCandidates.filter(item => !(item.code in userScores))
    if (noveltyPool.length && merged.length < topN) {
      const rand = noveltyPool[Math.floor(Math.random() * noveltyPool.length)]
      merged.push({ ...rand, method: 'novelty' })
    }
    if (merged.length < topN) addUnique(habitCandidates)
    if (merged.length < topN) addUnique(coCandidates)
    if (merged.length < topN) addUnique(personalCandidates)

    // 7) Format output
    return merged.slice(0, topN).map(({ code, score, method }) => {
      const dates = purchaseHistory
        .filter(b => b.products.some(p => p.product.itemCode === code))
        .map(b => new Date(b.timeStamp).getTime())
      return {
        itemCode: code,
        score,
        method,
        lastPurchased: dates.length ? Math.max(...dates) : null
      }
    })
  }
}
