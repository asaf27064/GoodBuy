const PurchaseModel = require('../models/purchaseModel')

/**
 * weighted recommender with:
 * 1) Habit detection (weekly patterns)
 * 2) Co-occurrence (items bought together)
 * 3) Personal recency-frequency
 * 4) Collaborative filtering (similar-user preferences)
 * 5) Global popularity boost
 */
module.exports = {
  recommend: async (userId, currentProducts, purchaseHistory, topN = 5) => {
    const now = new Date()
    const todayWd = now.getDay()
    const currentCodes = new Set(
      currentProducts.map(p => p.product.itemCode)
    )

    // Recency-frequency scores
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

    // Habit candidates
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
      .filter(([code, counts]) =>
        !currentCodes.has(code) && (counts[todayWd] || 0) >= minHabits
      )
      .map(([code, counts]) => ({
        code,
        score: counts[todayWd],
        method: 'habit'
      }))

    // Co-occurrence candidates
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

    // Personal top items
    const personalCandidates = Object.entries(userScores)
      .filter(([code]) => !currentCodes.has(code))
      .map(([code, uf]) => ({
        code,
        score: uf,
        method: 'personal'
      }))

    // Collaborative filtering
    const allPurchases = await PurchaseModel.find().lean()
    const userSet = new Set(
      purchaseHistory.flatMap(b => b.products.map(p => p.product.itemCode))
    )
    const userMap = {}
    allPurchases.forEach(basket => {
      const uid = basket.purchasedBy.toString()
      if (uid === userId.toString()) return
      userMap[uid] = userMap[uid] || new Set()
      basket.products.forEach(p =>
        userMap[uid].add(p.product.itemCode)
      )
    })
    const sims = Object.entries(userMap)
      .map(([uid, set]) => {
        const inter = [...set].filter(c => userSet.has(c)).length
        const uni = new Set([...set, ...userSet]).size
        return { uid, sim: uni > 0 ? inter / uni : 0 }
      })
      .filter(x => x.sim > 0)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 5)
    const cfScores = {}
    sims.forEach(({ uid, sim }) => {
      userMap[uid].forEach(code => {
        if (!currentCodes.has(code)) {
          cfScores[code] = (cfScores[code] || 0) + sim
        }
      })
    })
    const cfCandidates = Object.entries(cfScores).map(
      ([code, score]) => ({ code, score, method: 'cf' })
    )

    // Global popularity boost
    const globalAgg = await PurchaseModel.aggregate([
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.product.itemCode',
          count: { $sum: 1 }
        }
      }
    ])
    const maxCount =
      Math.max(...globalAgg.map(g => g.count), 1)
    const globalCounts = Object.fromEntries(
      globalAgg.map(g => [g._id, g.count])
    )
    const boostRatio = 0.1
    const boostList = list =>
      list.map(item => ({
        ...item,
        score:
          item.score +
          ((globalCounts[item.code] || 0) / maxCount) *
            boostRatio *
            item.score
      }))
    const boostedCo = boostList(coCandidates)
    const boostedPersonal = boostList(personalCandidates)

    // Pool setup & weighted sampling
    const pools = {
      habit: habitCandidates.sort((a, b) => b.score - a.score),
      co: boostedCo.sort((a, b) => b.score - a.score),
      cf: cfCandidates.sort((a, b) => b.score - a.score),
      personal: boostedPersonal.sort(
        (a, b) => b.score - a.score
      )
    }
    const weights = {
      habit: 0.15,
      co: 0.30,
      cf: 0.25,
      personal: 0.30
    }

    function pickMethod() {
      const r = Math.random()
      let acc = 0
      for (const m of Object.keys(weights)) {
        acc += weights[m]
        if (r <= acc) return m
      }
      return 'personal'
    }

    const result = []
    const used = new Set()
    while (result.length < topN) {
      const m = pickMethod()
      const pool = pools[m] || []
      let candidate = null
      while (pool.length) {
        const item = pool.shift()
        if (!used.has(item.code)) {
          candidate = item
          break
        }
      }
      if (candidate) {
        used.add(candidate.code)
        result.push(candidate)
      } else {
        // if empty pool, remove and normalize
        delete pools[m]
        delete weights[m]
        const total = Object.values(weights).reduce(
          (s, v) => s + v,
          0
        )
        Object.keys(weights).forEach(
          k => (weights[k] /= total)
        )
        if (!Object.keys(pools).length) break
      }
    }

    // Format output
    return result.map(({ code, score, method }) => {
      const dates = purchaseHistory
        .filter(b =>
          b.products.some(
            p => p.product.itemCode === code
          )
        )
        .map(b => new Date(b.timeStamp).getTime())
      return {
        itemCode: code,
        score,
        method,
        lastPurchased: dates.length
          ? Math.max(...dates)
          : null
      }
    })
  }
}
