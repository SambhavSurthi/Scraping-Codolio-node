import puppeteer from "puppeteer";

async function fetchCodolio() {
  const browser = await puppeteer.launch({ headless: false }); // keep false for debugging
  const page = await browser.newPage();

  await page.goto("https://codolio.com/profile/SambhavSurthi/problemSolving", {
    waitUntil: "networkidle2",
  });

  // let React fully render
  await new Promise(r => setTimeout(r, 5000));

  const data = await page.evaluate(() => {
    function getValueByLabel(label) {
      const nodes = Array.from(document.querySelectorAll("span, p, div"));
      const target = nodes.find(el => el.textContent.trim() === label);
      if (target) {
        // look for number in siblings
        let sibling = target.parentElement?.querySelector("span.MuiTypography-root, p.MuiTypography-root");
        return sibling?.textContent.trim() || null;
      }
      return null;
    }

    return {
      total_questions: getValueByLabel("Total Questions"),
      total_active_days: getValueByLabel("Total Active Days"),
      total_submissions: getValueByLabel("submissions"),
      max_streak: getValueByLabel("Max.Streak"),
      current_streak: getValueByLabel("Current.Streak"),
      total_contests: getValueByLabel("Total Contests"),
      awards: getValueByLabel("Awards"),
    };
  });

  console.log(data);

  await browser.close();
}

fetchCodolio();
