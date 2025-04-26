const puppeteer = require('puppeteer')
const axios     = require('axios')
const fs        = require('fs')
const path      = require('path')

const DOWNLOAD_DIR      = path.join(__dirname, 'FullPriceDownloads')
const SUCCESS_LIST_PATH = path.join(__dirname, 'success_pricefull_by_store.json')

const delay = ms => new Promise(res => setTimeout(res, ms))

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
}

const allRetailers = require('./retailer_accounts_merged.json')
const retailers    = allRetailers.filter(r => r.url.includes('url.publishedprices.co.il'))

;(async () => {
  const browser = await puppeteer.launch({ headless: true })
  const summary = []

  for (const entry of retailers) {
    console.log(`\n🔐 ${entry.name}`)
    const page = await browser.newPage()

    try {
      await page.goto(entry.url, { waitUntil: 'networkidle2' })
      await page.type('#username', entry.login.username)
      if (entry.login.password) {
        await page.type('#password', entry.login.password)
      }
      await Promise.all([
        page.click('button[type="submit"], input[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ])

      await page.waitForSelector('#fileList tbody tr', { timeout: 30000 })
      let rows = await page.$$('#fileList tbody tr')
      if (rows.length === 0) {
        await delay(2000)
        rows = await page.$$('#fileList tbody tr')
      }
      if (rows.length === 0) {
        console.warn(`   ⚠️ No files found for ${entry.name}, skipping.`)
        await page.close()
        continue
      }

      const rawHrefs = await page.$$eval(
        '#fileList tbody tr a.f',
        els => els.map(a => a.href || a.getAttribute('href'))
      )
      const gzLinks = rawHrefs
        .map(h => new URL(h, page.url()).href)
        .filter(h => /PriceFull.*\.gz$/i.test(h))

      const files = gzLinks.map(link => {
        const name = path.basename(link.split('?')[0])
        let m, storeId, ts

        m = name.match(/PriceFull\d+-\d+-([0-9]+)-(\d{8})-(\d{6})\.gz$/i)
        if (m) {
          storeId = m[1]
          ts      = m[2] + m[3]
        } else {
          m = name.match(/PriceFull\d+-([0-9]+)-(\d{12})\.gz$/i)
          if (m) {
            storeId = m[1]
            const dt = m[2]
            ts       = dt.slice(0,8) + dt.slice(8,12) + '00'
          } else {
            return null
          }
        }

        return { link, name, storeId, ts }
      }).filter(Boolean)

      const newest = {}
      for (const f of files) {
        if (!newest[f.storeId] || f.ts > newest[f.storeId].ts) {
          newest[f.storeId] = f
        }
      }
      const toDownload = Object.values(newest)
      console.log(`   📂 ${toDownload.length} stores → downloading 1 file each`)

      const shopDir = path.join(
        DOWNLOAD_DIR,
        entry.name.replace(/[\\/:"*?<>|]/g, '')
      )
      if (!fs.existsSync(shopDir)) {
        fs.mkdirSync(shopDir, { recursive: true })
      }

      const cookies      = await page.cookies()
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      for (const file of toDownload) {
        console.log(`   ⬇️  ${file.name}`)
        const resp = await axios.get(file.link, {
          responseType    : 'stream',
          timeout         : 60000,
          decompress      : false,
          headers         : {
            Cookie           : cookieHeader,
            'Accept-Encoding': 'identity'
          }
        })
        const outPath = path.join(shopDir, file.name)
        const ws      = fs.createWriteStream(outPath)
        resp.data.pipe(ws)
        await new Promise((res, rej) =>
          ws.on('finish', res).on('error', rej)
        )

        console.log(`     ✔️ Saved to ${shopDir}/${file.name}`)
        summary.push({
          retailer: entry.name,
          storeId : file.storeId,
          filename: file.name
        })
      }
    } catch (err) {
      console.error(`   ❌ ${entry.name}: ${err.message}`)
    } finally {
      try { if (!page.isClosed()) await page.close() } catch {}
    }
  }

  await browser.close()
  fs.writeFileSync(SUCCESS_LIST_PATH, JSON.stringify(summary, null, 2))
  console.log(
    `\n✅ Done — downloaded ${summary.length} files ` +
    `(one per store) into ${DOWNLOAD_DIR}`
  )
})()
