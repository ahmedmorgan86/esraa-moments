const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Admin panel
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem('em-lang', JSON.stringify('en'));
    localStorage.setItem('em-dark', JSON.stringify(false));
  });

  // Login as admin
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'screenshot-login.png', fullPage: false });
  console.log('login done');

  await browser.close();
})();
