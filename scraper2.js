const playwright = require('playwright');

async function fetchCodolioData(username) {
  if (!username) {
    console.error('Error: Please provide a username as a command-line argument.');
    process.exit(1);
  }

  const URL = `https://codolio.com/profile/${username}/problemSolving`;
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log(`Navigating to ${URL}...`);

  try {
    await page.goto(URL, { waitUntil: 'networkidle' });

    const data = {
      basicStats: {},
      problemsSolved: {},
      contestRankings: {},
      heatmap: [],
      dsaTopics: {}
    };

    // Helper to extract text of a stat by label
    async function extractStat(label) {
      const locator = page.locator(`:text("${label}")`);
      if (await locator.count() > 0) {
        const value = await locator.first().evaluate(el => el.nextElementSibling?.innerText);
        return value ? value.trim() : null;
      }
      return null;
    }

    // ---------- Basic Stats ----------
    console.log('Scraping basic stats...');
    data.basicStats.total_questions = await extractStat("Total Questions") || "0";
    data.basicStats.total_active_days = await extractStat("Total Active Days") || "0";

    // Submissions
    const submissionsEl = page.locator('text=/\\d+\\s+submissions/').first();
    if (await submissionsEl.count() > 0) {
      const submissionsText = await submissionsEl.innerText();
      data.basicStats.total_submissions = submissionsText.replace('submissions','').trim();
    } else {
      data.basicStats.total_submissions = "0";
    }

    data.basicStats.max_streak = await extractStat("Max.Streak") || "0";
    data.basicStats.current_streak = await extractStat("Current.Streak") || "0";
    data.basicStats.total_contests = await extractStat("Total Contests") || "0";
    data.basicStats.awards = await extractStat("Awards") || "0";

    // ---------- Problems Solved ----------
    console.log('Scraping problems solved...');
    const problemLabels = ['Fundamentals','DSA','Easy','Medium','Hard','Competitive Programming','Codechef','Codeforces','HackerRank'];
    for (const label of problemLabels) {
      const el = await page.locator(`:text("${label}")`).first();
      if (await el.count() > 0) {
        let val = await el.evaluate(node => {
          const sibling = node.nextElementSibling;
          if (!sibling) return '0';
          return sibling.innerText.trim();
        });
        data.problemsSolved[label.toLowerCase().replace(/ /g,'_')] = val || "0";
      } else {
        data.problemsSolved[label.toLowerCase().replace(/ /g,'_')] = "0";
      }
    }

    // ---------- Contest Rankings ----------
    console.log('Scraping contest rankings...');
    const contestSites = ['LeetCode','CodeChef','Codeforces','HackerRank'];
    for (const site of contestSites) {
      const el = await page.locator(`text=${site}`).first();
      if (await el.count() > 0) {
        const parent = await el.evaluateHandle(node => node.parentElement);
        const rating = await parent.evaluate(p => {
          const textNode = p.querySelector('span')?.innerText || '';
          return textNode.match(/\d+/)?.[0] || '0';
        });
        data.contestRankings[site.toLowerCase()] = { rating };
      } else {
        data.contestRankings[site.toLowerCase()] = { rating: "0" };
      }
    }

    // ---------- Heatmap ----------
    console.log('Scraping heatmap...');
    data.heatmap = await page.$$eval('svg.react-calendar-heatmap rect', rects =>
      rects.map(r => {
        // Example tooltip: "6 submissions on 12/06/2025"
        const tooltip = r.getAttribute('data-tooltip-content') || '';
        const match = tooltip.match(/(\d+)\s+submissions\s+on\s+(\d{2}\/\d{2}\/\d{4})/);
        if (match) {
          return {
            date: match[2],
            submissions: parseInt(match[1], 10),
            colorClass: r.getAttribute('class') || '',
            styleColor: r.style.fill || r.style.backgroundColor || ''
          };
        }
        return null;
      }).filter(x => x !== null) // Remove nulls
    );

    // ---------- DSA Topic Analysis ----------
    console.log('Scraping DSA topic analysis...');
    const topicEls = await page.$$('.dsa-topic-item'); // adjust selector based on actual site
    for (const topic of topicEls) {
      const name = await topic.$eval('.topic-name', el => el.innerText.trim());
      const solved = await topic.$eval('.topic-solved', el => el.innerText.trim());
      data.dsaTopics[name] = solved;
    }

    return data;

  } catch (error) {
    console.error('An error occurred during scraping:', error);
    return { error: 'Failed to scrape data' };
  } finally {
    await browser.close();
  }
}

// Run the scraper
const username = process.argv[2];
fetchCodolioData(username)
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error('Scraper failed:', err));
