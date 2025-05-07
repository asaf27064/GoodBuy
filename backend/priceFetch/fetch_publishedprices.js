const puppeteer = require('puppeteer')
const axios     = require('axios')
const fs        = require('fs')
const path      = require('path')
const { Client } = require('basic-ftp')

const DOWNLOAD_DIR = path.join(__dirname, 'Downloads')
const mode = process.argv[2] === 'update' ? 'update' : 'init'
console.log(`📦 Running in ${mode.toUpperCase()} mode`)

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
const allRetailers = require('./retailers.json')

const ftpRetailers = allRetailers.filter(r => r.ftp)
const webRetailers = allRetailers.filter(r => r.url && r.url.includes('url.publishedprices.co.il'))

;(async () => {
  const defaultBrowser = await puppeteer.launch({ headless: true })

  for (const entry of webRetailers) {
    console.log(`\n🔐 ${entry.name}`)
    await handleWeb(entry, defaultBrowser)
  }
  await defaultBrowser.close()

  for (const entry of ftpRetailers) {
    console.log(`\n🔌 FTP ${entry.name}`)
    await handleFtp(entry)
  }

  console.log('\n✅ All done')
})()

async function handleWeb(entry, browser) {
  const page = await browser.newPage()
  try {
    await page.goto(entry.url, { waitUntil: 'networkidle2' })
    await page.type('#username', entry.login.username)
    if (entry.login.password) await page.type('#password', entry.login.password)
    await Promise.all([
      page.click('button[type="submit"], input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ])
    const isDorAlon = entry.name.includes('דור אלון')
    const selectorTimeout = isDorAlon ? 90000 : 30000
    await page.waitForSelector('#fileList tbody tr', { timeout: selectorTimeout })

    let raw
    if (isDorAlon) {
      const html = await page.content()
      raw = []
      const gzRe = /href="([^\"]+\.gz)"/g
      let m
      while ((m = gzRe.exec(html))) {
        raw.push(new URL(m[1], page.url()).href)
      }
    } else {
      raw = await page.$$eval(
        '#fileList tbody tr a.f',
        els => els.map(a => a.href || a.getAttribute('href'))
      )
    }

    const links = raw
      .map(h => new URL(h, page.url()).href)
      .filter(h => matchMode(path.basename(h).toLowerCase()))
    if (!links.length) {
      console.warn(`   ⚠️ No matching files for ${entry.name}`)
      return
    }

    const files = links.map(parseFilename).filter(Boolean)
    const newest = pickNewest(files)
    const shopDir = path.join(
      DOWNLOAD_DIR,
      entry.name.replace(/[\\/:"*?<>|]/g, '')
    )
    if (!fs.existsSync(shopDir)) fs.mkdirSync(shopDir, { recursive: true })

    const cookies = await page.cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')
    for (const f of Object.values(newest)) {
      const out = path.join(shopDir, f.name)
      if (fs.existsSync(out)) continue
      console.log(`   ⬇️  ${f.name}`)
      const res = await axios.get(f.link, {
        responseType: 'stream', timeout: 60000, decompress: false,
        headers: { Cookie: cookieHeader, 'Accept-Encoding': 'identity' }
      })
      const ws = fs.createWriteStream(out)
      res.data.pipe(ws)
      await new Promise((r, e) => ws.on('finish', r).on('error', e))
      console.log(`     ✔️ Saved to ${out}`)
    }
  } catch (err) {
    console.error(`   ❌ ${entry.name}: ${err.message}`)
  } finally {
    await page.close()
  }
}

async function handleFtp(entry) {
  const client = new Client()
  try {
    await client.access({
      host: process.env.PRICE_HOST || 'publishedprices.co.il',
      user: entry.login.username,
      password: entry.login.password || '',
      secure: process.env.USE_TLS !== '0'
    })
    const all = []
    async function walk(dir) {
      for (const f of await client.list(dir)) {
        const p = path.posix.join(dir, f.name)
        if (f.isDirectory) await walk(p)
        else if (p.endsWith('.gz')) all.push(p)
      }
    }
    await walk('/')
    await client.close()

    const filtered = all.filter(p => matchMode(path.basename(p).toLowerCase()))
    if (!filtered.length) {
      console.warn(`   ⚠️ No matching FTP files for ${entry.name}`)
      return
    }

    const parsed = filtered.map(remote => { const obj = parseFilename(remote); obj.remote = remote; return obj }).filter(Boolean)
    const newest = pickNewest(parsed)
    const shopDir = path.join(DOWNLOAD_DIR, entry.name.replace(/[\\/:"*?<>|]/g, ''))
    if (!fs.existsSync(shopDir)) fs.mkdirSync(shopDir, { recursive: true })

    for (const f of Object.values(newest)) {
      const local = path.join(shopDir, f.name)
      if (fs.existsSync(local)) continue
      console.log(`   ⬇️  FTP ${f.name}`)
      const c2 = new Client()
      await c2.access({ host: process.env.PRICE_HOST || 'publishedprices.co.il', user: entry.login.username, password: entry.login.password || '', secure: process.env.USE_TLS !== '0' })
      await fs.promises.mkdir(path.dirname(local), { recursive: true })
      await c2.downloadTo(local, f.remote)
      await c2.close()
      console.log(`     ✔️ Saved FTP to ${local}`)
    }
  } catch (err) {
    console.error(`   ❌ FTP ${entry.name}: ${err.message}`)
    client.close()
  }
}

function matchMode(name) {
  if (mode === 'init') return /^pricefull.*\.gz$/.test(name)
  return (/^prices.*\.gz$/.test(name) || (/^price.*\.gz$/.test(name) && !/^pricefull/.test(name)))
}
function parseFilename(link) {
  const name = path.basename(link.split('?')[0])
  let m = name.match(/(?:PriceFull|Prices|Price)\d+-\d+-([0-9]+)-(\d{8})-(\d{6})\.gz$/i)
  let storeId, ts
  if (m) { storeId = m[1]; ts = m[2] + m[3] } 
  else { m = name.match(/(?:PriceFull|Prices|Price)\d+-([0-9]+)-(\d{12})\.gz$/i); if (m) { storeId = m[1]; const dt = m[2]; ts = dt.slice(0,8)+dt.slice(8,12)+'00' } else return null }
  return { link, name, storeId, ts }
}
function pickNewest(arr) {
  return arr.reduce((map,f) => { if (!map[f.storeId] || f.ts > map[f.storeId].ts) map[f.storeId] = f; return map }, {})
}
