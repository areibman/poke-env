const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();
  
  // Navigate to the home page
  console.log('Navigating to http://localhost:3000/');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  
  // Wait for the page to fully render
  await page.waitForTimeout(2000);
  
  // Take a full page screenshot
  console.log('Taking full page screenshot...');
  await page.screenshot({ 
    path: '/workspace/screenshot-full.png', 
    fullPage: true 
  });
  
  // Scroll to the Sample Runs section and take a screenshot
  console.log('Scrolling to Sample Runs section...');
  await page.evaluate(() => {
    const replaysSection = document.getElementById('replays');
    if (replaysSection) {
      replaysSection.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  });
  await page.waitForTimeout(1000);
  
  await page.screenshot({ 
    path: '/workspace/screenshot-sample-runs.png'
  });
  
  // Take a mobile viewport screenshot
  console.log('Taking mobile screenshot...');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Scroll to the Sample Runs section on mobile
  await page.evaluate(() => {
    const replaysSection = document.getElementById('replays');
    if (replaysSection) {
      replaysSection.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  });
  await page.waitForTimeout(1000);
  
  await page.screenshot({ 
    path: '/workspace/screenshot-mobile.png'
  });
  
  await browser.close();
  console.log('Screenshots saved!');
})();
