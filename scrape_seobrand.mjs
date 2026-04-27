import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE_URL = 'https://www.seobrand.com';

// Pages to visit - homepage + all likely sub-pages
const PAGES_TO_SCRAPE = [
  '/',
  '/services/',
  '/about/',
  '/case-studies/',
  '/pricing/',
  '/seo/',
  '/content-marketing/',
  '/ppc/',
  '/pay-per-click/',
  '/web-design/',
  '/local-seo/',
  '/enterprise-seo/',
  '/link-building/',
  '/reputation-management/',
  '/social-media/',
  '/social-media-marketing/',
  '/digital-marketing/',
  '/blog/',
  '/contact/',
  '/team/',
  '/our-process/',
  '/results/',
  '/portfolio/',
];

async function scrapePage(page, url) {
  try {
    console.log(`Scraping: ${url}`);
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    if (!response || response.status() === 404) {
      return null;
    }

    await page.waitForTimeout(1500);

    const data = await page.evaluate(() => {
      // Remove scripts, styles, nav clutter
      const removeSelectors = ['script', 'style', 'noscript', 'iframe', 'svg'];
      removeSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
      });

      const title = document.title;
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';

      // Get all meaningful text blocks
      const blocks = [];

      // Headings
      document.querySelectorAll('h1, h2, h3, h4').forEach(el => {
        const text = el.innerText?.trim();
        if (text && text.length > 2) {
          blocks.push(`[${el.tagName}] ${text}`);
        }
      });

      // Paragraphs and list items
      document.querySelectorAll('p, li, span.stat, div.stat, [class*="stat"], [class*="number"], [class*="count"]').forEach(el => {
        const text = el.innerText?.trim();
        if (text && text.length > 20 && !blocks.includes(text)) {
          blocks.push(text);
        }
      });

      // Stats / numbers (often in dedicated containers)
      document.querySelectorAll('[class*="highlight"], [class*="metric"], [class*="result"], [class*="achievement"]').forEach(el => {
        const text = el.innerText?.trim();
        if (text && text.length > 3) {
          blocks.push(`[STAT] ${text}`);
        }
      });

      // Navigation links (find all sub-pages)
      const navLinks = [];
      document.querySelectorAll('nav a, header a, footer a').forEach(el => {
        const href = el.getAttribute('href');
        const text = el.innerText?.trim();
        if (href && text && href.startsWith('/') && !href.includes('#')) {
          navLinks.push({ text, href });
        }
      });

      return { title, metaDesc, blocks, navLinks, url: window.location.href };
    });

    return data;
  } catch (err) {
    console.log(`  Failed: ${err.message}`);
    return null;
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const results = [];
  const discoveredLinks = new Set();

  // First pass - scrape all predefined pages
  for (const path of PAGES_TO_SCRAPE) {
    const url = BASE_URL + path;
    const data = await scrapePage(page, url);
    if (data) {
      results.push(data);
      // Collect discovered nav links
      data.navLinks?.forEach(link => {
        if (link.href && !discoveredLinks.has(link.href)) {
          discoveredLinks.add(link.href);
        }
      });
    }
  }

  // Second pass - scrape any newly discovered links not already visited
  const visitedPaths = new Set(PAGES_TO_SCRAPE);
  const newLinks = [...discoveredLinks].filter(href => !visitedPaths.has(href) && !href.includes('?') && href.length < 60);
  
  console.log(`\nDiscovered ${newLinks.length} new links to scrape...`);
  for (const href of newLinks.slice(0, 20)) { // Cap at 20 extra pages
    const url = BASE_URL + href;
    const data = await scrapePage(page, url);
    if (data) {
      results.push(data);
    }
  }

  await browser.close();

  // Format output
  let output = '# SEO Brand Website — Full Content Extraction\n';
  output += `Scraped: ${new Date().toISOString()}\n`;
  output += `Total pages: ${results.length}\n\n`;
  output += '---\n\n';

  for (const page_data of results) {
    output += `## ${page_data.title}\n`;
    output += `**URL:** ${page_data.url}\n`;
    if (page_data.metaDesc) output += `**Meta:** ${page_data.metaDesc}\n`;
    output += '\n';
    
    if (page_data.blocks.length > 0) {
      output += page_data.blocks.join('\n') + '\n';
    }

    if (page_data.navLinks?.length > 0) {
      const uniqueLinks = [...new Set(page_data.navLinks.map(l => `${l.text} → ${l.href}`))];
      output += '\n**Navigation Links Found:**\n';
      output += uniqueLinks.slice(0, 30).join('\n') + '\n';
    }

    output += '\n---\n\n';
  }

  writeFileSync('seobrand_scraped_content.txt', output, 'utf8');
  console.log('\n✅ Done! Output saved to seobrand_scraped_content.txt');
  console.log(`Total pages scraped: ${results.length}`);
}

main().catch(console.error);
