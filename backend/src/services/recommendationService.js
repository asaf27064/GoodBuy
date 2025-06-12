// backend/src/services/recommendationService.js

module.exports = {
  recommend: (userId, currentProducts, purchaseHistory, topN = 5) => {
    const now = new Date()
    const todayWeekday = now.getDay()     // 0=Sunday…6=Saturday
    const currentCodes = new Set(currentProducts.map(p => p.product.itemCode))

    // 1) Compute recency-frequency scores
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

    // 2) Detect weekly habits
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

    // 3) Habit candidates
    let candidates = []
    for (const [code, counts] of Object.entries(weekdayCounts)) {
      if (currentCodes.has(code)) continue
      const cnt = counts[todayWeekday] || 0
      if (cnt >= minHabits) {
        // boost habits to the top
        const score = cnt * 10 + (userScores[code] || 0)
        candidates.push({ code, score, method: 'habit' })
      }
    }

    // 4) Fallback to co-occurrence
    if (candidates.length === 0) {
      const coCounts = {}
      purchaseHistory.forEach(basket => {
        const codes = basket.products.map(p => p.product.itemCode)
        if (!codes.some(c => currentCodes.has(c))) return
        codes.forEach(c => {
          if (!currentCodes.has(c)) coCounts[c] = (coCounts[c] || 0) + 1
        })
      })
      const α = 0.5
      candidates = Object.entries(coCounts).map(([code, co]) => ({
        code,
        score: co * (1 + α * (userScores[code] || 0)),
        method: 'co-occurrence'
      }))
    }

    // 5) Final fallback: personal top
    if (candidates.length === 0) {
      candidates = Object.entries(userScores)
        .filter(([code]) => !currentCodes.has(code))
        .map(([code, uf]) => ({ code, score: uf, method: 'personal' }))
    }

    // 6) Sort & top N, attach lastPurchased
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(({ code, score, method }) => {
        const dates = purchaseHistory
          .filter(b => b.products.some(p => p.product.itemCode === code))
          .map(b => new Date(b.timeStamp).getTime())
        return {
          itemCode:      code,
          score,
          method,
          lastPurchased: dates.length ? Math.max(...dates) : null
        }
      })
  }
}
