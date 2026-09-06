const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });

  context.on('serviceworker', async worker => {
    console.log(`[ServiceWorker] Registered: ${worker.url()}`);
    worker.on('console', msg => {
      console.log(`[SW ${msg.type()}] ${msg.text()}`);
    });
    worker.on('pageerror', err => {
      console.log(`[SW Exception] ${err.message}`);
    });
  });

  page.on('requestfailed', request => {
    console.log(`[Browser network error] ${request.url()}: ${request.failure().errorText}`);
  });

  page.on('response', async response => {
    if (response.status() >= 400) {
      console.log(`[Browser network 4xx/5xx] ${response.url()}: ${response.status()}`);
      try {
        const text = await response.text();
        console.log(`[Response Body] ${text.substring(0, 500)}`);
      } catch (e) {
        console.log(`[Response Body] Could not read body: ${e.message}`);
      }
    }
  });

  page.on('pageerror', error => {
    console.log(`[Browser Exception] ${error.message}`);
  });

  console.log('Navigating to proxy...');
  try {
    await page.goto('http://localhost:8080/?key=grandma123', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Waiting 10 seconds for proxy to initialize and iframe to load...');
    await page.waitForTimeout(10000);
    
    const frames = page.frames();
    console.log(`Found ${frames.length} frames.`);
    for (const frame of frames) {
      console.log(`Frame URL: ${frame.url()}`);
      if (frame.url().includes('httpbin.org')) {
        try {
          const bodyText = await frame.textContent('body');
          console.log(`[HttpBin Response] ${bodyText}`);
        } catch(e) {}
      }
    }
    
    await page.screenshot({ path: 'screenshot.png' });
    console.log('Screenshot saved to screenshot.png');
  } catch (err) {
    console.error('Error during navigation:', err);
  } finally {
    await browser.close();
  }
})();
