const express = require('express');
const playwright = require('playwright');

const app = express();
const PORT = 3000;

// Main function to scrape Codolio data
async function fetchCodolioData(username) {
  if (!username) {
    return { error: 'Username is required' };
  }

  const URL = `https://codolio.com/profile/${username}/problemSolving`;
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

  try {
    // Fake user agent to bypass bot detection
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/115 Safari/537.36"
    );

    await page.goto(URL, { waitUntil: 'domcontentloaded' });

    // Explicit wait for a key element
    await page.waitForSelector('text=Total Questions', { timeout: 15000 });

    const data = {
      basicStats: {},
      problemsSolved: {},
      contestRankings: {},
      heatmap: [],
      dsaTopics: {}
    };

    async function extractStat(label) {
      const locator = page.locator(`:text("${label}")`);
      if (await locator.count() > 0) {
        const value = await locator.first().evaluate(el => el.nextElementSibling?.innerText);
        return value ? value.trim() : null;
      }
      return null;
    }

    // ---------- Basic Stats ----------
    data.basicStats.total_questions = await extractStat("Total Questions") || "0";
    data.basicStats.total_active_days = await extractStat("Total Active Days") || "0";

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
    data.heatmap = await page.$$eval('svg.react-calendar-heatmap rect', rects =>
      rects.map(r => {
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
      }).filter(x => x !== null)
    );

    // ---------- DSA Topic Analysis ----------
    const topicEls = await page.$$('.dsa-topic-item');
    for (const topic of topicEls) {
      const name = await topic.$eval('.topic-name', el => el.innerText.trim());
      const solved = await topic.$eval('.topic-solved', el => el.innerText.trim());
      data.dsaTopics[name] = solved;
    }

    return data;

  } catch (error) {
    console.error('Scraping error:', error);

    // Debug dump (helps in Render logs)
    const html = await page.content();
    console.error("Page snapshot:", html.slice(0, 500));

    return { error: 'Failed to scrape data' };
  } finally {
    await browser.close();
  }
}

// Express route
app.get('/api/:username', async (req, res) => {
  const username = req.params.username;
  const data = await fetchCodolioData(username);
  res.json(data);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Try http://localhost:${PORT}/api/<username>`);
});
