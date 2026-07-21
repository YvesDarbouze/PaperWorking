const { chromium } = require('@playwright/test');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('https://antigravity.google/pricing', { waitUntil: 'networkidle' });
  
  const cardsData = await page.evaluate(() => {
    function getElementStyles(el) {
      if (!el) return null;
      const comp = window.getComputedStyle(el);
      return {
        tagName: el.tagName,
        className: el.className,
        text: el.innerText.trim().replace(/\n/g, ' | '),
        fontFamily: comp.fontFamily,
        fontSize: comp.fontSize,
        fontWeight: comp.fontWeight,
        lineHeight: comp.lineHeight,
        letterSpacing: comp.letterSpacing,
        color: comp.color,
        backgroundColor: comp.backgroundColor,
        padding: comp.padding,
        margin: comp.margin,
        border: comp.border,
        borderRadius: comp.borderRadius,
        boxShadow: comp.boxShadow,
        width: comp.width,
        height: comp.height,
        display: comp.display,
      };
    }
    
    // Find all pricing-card elements
    const cards = Array.from(document.querySelectorAll('.pricing-card'));
    return cards.map(c => {
      // Find title, price, cta inside this card
      const h2 = c.querySelector('h2');
      const priceText = Array.from(c.querySelectorAll('*')).find(el => el.innerText && el.innerText.includes('$'));
      const btn = c.querySelector('a, button');
      
      return {
        card: getElementStyles(c),
        h2: getElementStyles(h2),
        price: getElementStyles(priceText),
        button: getElementStyles(btn),
      };
    });
  });
  
  console.log(JSON.stringify(cardsData, null, 2));
  fs.writeFileSync('/Users/yvesdarbouze/.gemini/antigravity/brain/80408936-7203-445d-8a3d-ebf4d31d5e15/scratch/all_pricing_cards.json', JSON.stringify(cardsData, null, 2));
  await browser.close();
}

run().catch(err => console.error(err));
