// shufersal_parallel_scraper.js
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

(async () => {
  const CAT_ID = 2;  // pricefull
  const BASE_URL = 'https://prices.shufersal.co.il/FileObject/UpdateCategory';
  const DOWNLOAD_DIR = path.join(__dirname, 'FullPriceDownloads');
  const MAX_CONCURRENT_DOWNLOADS = 5; // Adjust based on your internet connection
  const MAX_CONCURRENT_PAGES = 5; // Control how many pages are processed simultaneously
  const NAVIGATION_TIMEOUT = 60000; // Extend timeout to 60 seconds

  // ensure download dir exists
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  console.log(`📥 Starting Shufersal price file scraper...`);
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Add these arguments for stability
  });
  const page = await browser.newPage();

  // Set longer timeout for navigation
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);

  try {
    // load page 1
    console.log(`🌐 Loading initial page: ${BASE_URL}?catID=${CAT_ID}`);
    await page.goto(`${BASE_URL}?catID=${CAT_ID}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('table tbody', { timeout: NAVIGATION_TIMEOUT });

    // scrape all page numbers from any anchor containing "?page="
    const pageNums = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll('a[href*="page="]')
      )
        .map(a => {
          const m = a.href.match(/page=(\d+)/);
          return m ? parseInt(m[1], 10) : NaN;
        })
        .filter(n => !isNaN(n));
    });

    const maxPage = pageNums.length ? Math.max(...pageNums) : 1;
    console.log(`🗂️  Detected ${maxPage} page(s) total.`);

    // Function to scrape one page with retry logic
    async function scrapePage(pageNum, retryCount = 0) {
      const maxRetries = 3;
      try {
        const pageBrowser = await puppeteer.launch({ 
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const pageTab = await pageBrowser.newPage();
        
        // Set longer timeout for navigation
        pageTab.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
        
        console.log(`📄 Loading page ${pageNum}/${maxPage}: ${BASE_URL}?catID=${CAT_ID}&page=${pageNum}`);
        await pageTab.goto(`${BASE_URL}?catID=${CAT_ID}&page=${pageNum}`, { 
          waitUntil: 'networkidle2',
          timeout: NAVIGATION_TIMEOUT
        });
        
        // Wait for table to load
        await pageTab.waitForSelector('table tbody', { timeout: NAVIGATION_TIMEOUT });
        
        // Short delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // grab every .gz link on this page
        const links = await pageTab.$$eval('a[href*=".gz"]', as => as.map(a => a.href));
        console.log(`   🎯 Found ${links.length} .gz file(s) on page ${pageNum}`);

        // For debugging: log first few filenames if it's the first page
        if (pageNum === 1 && links.length > 0) {
          console.log(`   📋 Sample filenames:`);
          for (let i = 0; i < Math.min(3, links.length); i++) {
            console.log(`      - ${path.basename(links[i].split('?')[0])}`);
          }
        }

        const pageFiles = [];
        // parse out storeId + timestamp from filename
        for (const link of links) {
          const name = path.basename(link.split('?')[0]);
          
          // Based on the output, the format appears to be:
          // PriceFull7290027600007-XXX-YYYYMMDDHHMM.gz
          // where XXX is the store ID
          const m = name.match(/PriceFull(\d+)-(\d+)-(\d{12})\.gz$/i);
          
          if (m) {
            const [, chainId, storeId, timestamp] = m;
            const yyyymmdd = timestamp.substring(0, 8);
            const hhmmss = timestamp.substring(8, 12) + '00'; // Adding seconds as '00'
            
            pageFiles.push({
              link,
              name,
              storeId,
              chainId,
              ts: `${yyyymmdd}${hhmmss}`
            });
          } else {
            // Try the format with separate date and time
            const m2 = name.match(/PriceFull(\d+)-(\d+)-(\d{8})(\d{4})\.gz$/i);
            if (m2) {
              const [, chainId, storeId, yyyymmdd, hhmm] = m2;
              const hhmmss = hhmm + '00'; // Adding seconds as '00'
              
              pageFiles.push({
                link,
                name,
                storeId,
                chainId,
                ts: `${yyyymmdd}${hhmmss}`
              });
            } else {
              console.log(`   ⚠️ Could not parse filename pattern: ${name}`);
            }
          }
        }

        await pageBrowser.close();
        return pageFiles;
      } catch (err) {
        if (retryCount < maxRetries) {
          console.log(`   ⚠️ Page ${pageNum} load failed (attempt ${retryCount + 1}/${maxRetries + 1}): ${err.message}`);
          // Exponential backoff
          const delay = 2000 * Math.pow(2, retryCount);
          console.log(`   🕒 Retrying in ${delay/1000} seconds...`);
          await new Promise(r => setTimeout(r, delay));
          return scrapePage(pageNum, retryCount + 1);
        } else {
          console.log(`   ❌ All attempts failed for page ${pageNum}: ${err.message}`);
          return []; // Return empty array after exhausting retries
        }
      }
    }

    // Process pages in batches to avoid overwhelming the system
    console.log(`\n🚀 Starting processing of ${maxPage} pages in batches of ${MAX_CONCURRENT_PAGES}...`);
    const allFiles = [];
    
    for (let startPage = 1; startPage <= maxPage; startPage += MAX_CONCURRENT_PAGES) {
      const endPage = Math.min(startPage + MAX_CONCURRENT_PAGES - 1, maxPage);
      console.log(`\n🔄 Processing pages ${startPage}-${endPage}...`);
      
      const pagePromises = [];
      for (let p = startPage; p <= endPage; p++) {
        pagePromises.push(scrapePage(p));
      }
      
      // Wait for this batch of pages to complete
      const batchResults = await Promise.all(pagePromises);
      allFiles.push(...batchResults.flat());
      
      // Brief pause between batches
      if (endPage < maxPage) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log(`\n📊 Total files found: ${allFiles.length}`);
    
    if (allFiles.length === 0) {
      console.log("⚠️ No files were successfully parsed. Check the filename patterns or server issues.");
      process.exit(1);
    }

    // List first few files for debugging
    console.log(`📋 Sample of parsed files:`);
    for (let i = 0; i < Math.min(5, allFiles.length); i++) {
      console.log(`   - Store: ${allFiles[i].storeId}, Timestamp: ${allFiles[i].ts}, File: ${allFiles[i].name}`);
    }

    // pick the newest file per store
    const latestByStore = {};
    for (const f of allFiles) {
      if (!latestByStore[f.storeId] || f.ts > latestByStore[f.storeId].ts) {
        latestByStore[f.storeId] = f;
      }
    }
    const toDownload = Object.values(latestByStore);
    console.log(`\n📂 ${toDownload.length} stores → will download 1 file each`);

    // Function to process (download + decompress) a single file
    async function processFile(file) {
      const gzPath = path.join(DOWNLOAD_DIR, file.name);
      const xmlName = file.name.replace(/\.gz$/i, '.xml');
      const xmlPath = path.join(DOWNLOAD_DIR, xmlName);

      try {
        console.log(`⬇️ Downloading: ${file.name}`);
        // download .gz with timeout and retries
        const maxRetries = 3;
        let retries = 0;
        let success = false;
        
        while (retries < maxRetries && !success) {
          try {
            const resp = await axios.get(file.link, { 
              responseType: 'stream', 
              timeout: 90000, // Longer timeout for downloads
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Referer': BASE_URL
              }
            });
            
            await new Promise((res, rej) => {
              const ws = fs.createWriteStream(gzPath);
              resp.data.pipe(ws)
                .on('finish', () => {
                  success = true;
                  res();
                })
                .on('error', rej);
            });
            
            console.log(`   ✔️ Saved gzip: ${gzPath}`);
          } catch (err) {
            retries++;
            console.log(`   ⚠️ Download attempt ${retries}/${maxRetries} failed: ${err.message}`);
            if (retries >= maxRetries) throw err;
            await new Promise(r => setTimeout(r, 2000 * retries)); // Exponential backoff
          }
        }

        // gunzip → .xml
        try {
          await new Promise((res, rej) => {
            fs.createReadStream(gzPath)
              .pipe(zlib.createGunzip())
              .pipe(fs.createWriteStream(xmlPath))
              .on('finish', res)
              .on('error', rej);
          });
          console.log(`   🔓 Decompressed: ${xmlPath}`);

          // remove .gz
          fs.unlinkSync(gzPath);
          console.log(`   🗑️  Deleted gzip: ${gzPath}`);
        } catch (decompressErr) {
          console.error(`   ⚠️ Decompression failed: ${decompressErr.message}`);
          return { success: false, file, error: decompressErr };
        }
        
        return { success: true, file };
      } catch (err) {
        console.error(`   ❌ Failed to process ${file.name}: ${err.message}`);
        // Cleanup any partial files
        if (fs.existsSync(gzPath)) {
          try { fs.unlinkSync(gzPath); } catch (e) {}
        }
        return { success: false, file, error: err };
      }
    }

    // Process files in batches to avoid overwhelming system resources
    console.log(`\n⏳ Starting file downloads with max ${MAX_CONCURRENT_DOWNLOADS} concurrent downloads...`);
    let successCount = 0;
    let failCount = 0;
    
    // Process files in batches
    for (let i = 0; i < toDownload.length; i += MAX_CONCURRENT_DOWNLOADS) {
      const batch = toDownload.slice(i, i + MAX_CONCURRENT_DOWNLOADS);
      console.log(`\n🔄 Processing batch ${Math.floor(i/MAX_CONCURRENT_DOWNLOADS) + 1}/${Math.ceil(toDownload.length/MAX_CONCURRENT_DOWNLOADS)} (${batch.length} files)`);
      
      const results = await Promise.all(batch.map(file => processFile(file)));
      
      successCount += results.filter(r => r.success).length;
      failCount += results.filter(r => !r.success).length;
      
      // Brief pause between batches
      if (i + MAX_CONCURRENT_DOWNLOADS < toDownload.length) {
        console.log(`   ⏸️ Brief pause between batches...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log(`\n🏁 All done! Successfully processed ${successCount} files, ${failCount} failed.`);
  } catch (err) {
    console.error(`\n❌ Unhandled error: ${err.message}`);
    console.error(err);
  } finally {
    await browser.close();
    console.log(`\n👋 Browser closed. Script complete.`);
  }
})().catch(err => {
  console.error(`\n💥 Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});