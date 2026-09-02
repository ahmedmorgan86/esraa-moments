const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // First load to set localStorage
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem('em-lang', JSON.stringify('en'));
    localStorage.setItem('em-dark', JSON.stringify(false));
  });

  // Navigate to each English page
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: 'screenshot-en-home.png', fullPage: false });
  console.log('en home done');

  await page.goto('http://localhost:5173/shop', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: 'screenshot-en-shop.png', fullPage: false });
  console.log('en shop done');

  await page.goto('http://localhost:5173/product/p1', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: 'screenshot-en-product.png', fullPage: false });
  console.log('en product done');

  // Switch to Arabic
  await page.evaluate(() => {
    localStorage.setItem('em-lang', JSON.stringify('ar'));
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: 'screenshot-ar-home.png', fullPage: false });
  console.log('ar home done');

  await page.goto('http://localhost:5173/product/p1', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: 'screenshot-ar-product.png', fullPage: false });
  console.log('ar product done');

  await browser.close();
})();
