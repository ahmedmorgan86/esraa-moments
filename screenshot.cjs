const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => { localStorage.setItem('em-lang', JSON.stringify('ar')); localStorage.setItem('em-dark', JSON.stringify(false)); });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: 'screenshot-ar.png', fullPage: false });
  console.log('ar home done');
  await browser.close();
})();
