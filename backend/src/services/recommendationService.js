// backend/src/services/recommendationService.js

module.exports = {
  recommend: (userId, currentProducts, purchaseHistory, topN = 5) => {
    const now = new Date()
    const todayWd = now.getDay() // 0=Sun…6=Sat
    const currentCodes = new Set(
      currentProducts.map(p => p.product.itemCode)
    )

    // 1) Build recency-frequency scores
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

    // 2) Habit detection (bought same weekday ≥ minHabits)
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
      .filter(([code, counts]) => {
        return (
          !currentCodes.has(code) &&
          (counts[todayWd] || 0) >= minHabits
        )
      })
      .map(([code, counts]) => {
        const base = counts[todayWd]
        return {
          code,
          score: base * 10 + (userScores[code] || 0),
          method: 'habit'
        }
      })

    // 3) Co-occurrence counts
    const coCounts = {}
    purchaseHistory.forEach(basket => {
      const codes = basket.products.map(p => p.product.itemCode)
      if (!codes.some(c => currentCodes.has(c))) return
      codes.forEach(c => {
        if (!currentCodes.has(c)) {
          coCounts[c] = (coCounts[c] || 0) + 1
        }
      })
    })
    const α = 0.5
    const coCandidates = Object.entries(coCounts)
      .filter(([code]) => !currentCodes.has(code))
      .map(([code, co]) => ({
        code,
        score: co * (1 + α * (userScores[code] || 0)),
        method: 'co-occurrence'
      }))

    // 4) Personal top items
    const personalCandidates = Object.entries(userScores)
      .filter(([code]) => !currentCodes.has(code))
      .map(([code, uf]) => ({
        code,
        score: uf,
        method: 'personal'
      }))

    // 5) Merge in priority: habits → co-occurrence → personal
    const merged = []
    const addUnique = list => {
      for (const x of list) {
        if (merged.find(m => m.code === x.code)) continue
        merged.push(x)
        if (merged.length === topN) break
      }
    }
    addUnique(habitCandidates)
    if (merged.length < topN) addUnique(coCandidates)
    if (merged.length < topN) addUnique(personalCandidates)

    // 6) Format with lastPurchased
    return merged.map(({ code, score, method }) => {
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
