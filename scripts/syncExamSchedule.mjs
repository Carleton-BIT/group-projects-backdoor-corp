import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const EXAM_URL = "https://carleton.ca/ses/examination-services/exam-schedule/";
const OUTPUT_PATH = path.resolve("src/examSchedule.json");

function monthToNumber(mon) {
  const map = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12",
  };
  return map[mon.toUpperCase()] ?? "";
}

function normalizeDate(value) {
  const match = value.trim().match(/^([A-Z]{3})-(\d{1,2})-(\d{4})$/i);
  if (!match) return value.trim();
  const month = monthToNumber(match[1]);
  const day = match[2].padStart(2, "0");
  const year = match[3];
  return month ? `${year}-${month}-${day}` : value.trim();
}

function normalizeTime(value) {
  return value.trim();
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function toKey(item) {
  return [
    item.courseCode,
    item.section ?? "",
    item.date,
    item.time ?? "",
    item.endTime ?? "",
    item.location ?? "",
    item.availability ?? "",
  ].join("|");
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    return toKey(a).localeCompare(toKey(b));
  });
}

async function readExistingJson() {
  try {
    const raw = await fs.readFile(OUTPUT_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function scrapeExamRows() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(EXAM_URL, { waitUntil: "networkidle", timeout: 120000 });

    const rows = [];
    const seenPages = new Set();

    async function collectCurrentPageRows() {
      await page.waitForTimeout(1000);

      const pageRows = await page.evaluate(() => {
        const tables = Array.from(document.querySelectorAll("table"));
        const allRows = [];

        for (const table of tables) {
          const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
          for (const tr of bodyRows) {
            const cells = Array.from(tr.querySelectorAll("td"))
              .map((td) => (td.textContent ?? "").replace(/\s+/g, " ").trim())
              .filter(Boolean);

            if (cells.length < 8) continue;

            allRows.push(cells);
          }
        }

        return allRows;
      });

      for (const cells of pageRows) {
        let dept = "";
        let courseNumber = "";
        let section = "";
        let startDate = "";
        let startTime = "";
        let endDate = "";
        let endTime = "";
        let location = "";
        let availability = "";

        if (cells.length >= 9) {
          [dept, courseNumber, section, startDate, startTime, endDate, endTime, location, availability] = cells;
        } else if (cells.length === 8) {
          [dept, courseNumber, startDate, startTime, endDate, endTime, location, availability] = cells;
        } else {
          continue;
        }

        dept = normalizeText(dept);
        courseNumber = normalizeText(courseNumber);
        section = normalizeText(section);
        startDate = normalizeText(startDate);
        startTime = normalizeText(startTime);
        endDate = normalizeText(endDate);
        endTime = normalizeText(endTime);
        location = normalizeText(location);
        availability = normalizeText(availability);

        if (!dept || !courseNumber || !startDate) continue;

        rows.push({
          dept,
          courseCode: `${dept}${courseNumber}`.replace(/\s+/g, ""),
          course: `${dept} ${courseNumber}`,
          section,
          date: normalizeDate(startDate),
          time: normalizeTime(startTime),
          endDate: normalizeDate(endDate || startDate),
          endTime: normalizeTime(endTime),
          location,
          availability,
          type: "exam",
        });
      }
    }

    await collectCurrentPageRows();

    while (true) {
      const nextInfo = await page.evaluate((seen) => {
        const clickable = Array.from(document.querySelectorAll("a, button"));
        for (const el of clickable) {
          const text = (el.textContent ?? "").trim();
          if (/^\d+$/.test(text) && !seen.includes(text)) {
            return { found: true, label: text };
          }
        }
        return { found: false, label: "" };
      }, Array.from(seenPages));

      if (!nextInfo.found) break;

      seenPages.add(nextInfo.label);

      const clicked = await page.evaluate((label) => {
        const clickable = Array.from(document.querySelectorAll("a, button"));
        const target = clickable.find((el) => (el.textContent ?? "").trim() === label);
        if (!target) return false;
        target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return true;
      }, nextInfo.label);

      if (!clicked) break;

      await page.waitForLoadState("networkidle").catch(() => {});
      await collectCurrentPageRows();
    }

    const dedupedMap = new Map();
    for (const row of rows) {
      dedupedMap.set(toKey(row), row);
    }

    return sortItems(Array.from(dedupedMap.values()));
  } finally {
    await browser.close();
  }
}

async function main() {
  const existing = await readExistingJson();
  const latest = await scrapeExamRows();

  if (latest.length === 0) {
    throw new Error("No exam rows were scraped. Aborting so the JSON is not overwritten with empty data.");
  }

  const existingSerialized = JSON.stringify(sortItems(existing), null, 2);
  const latestSerialized = JSON.stringify(latest, null, 2);

  if (existingSerialized === latestSerialized) {
    console.log("No changes detected in examSchedule.json");
    return;
  }

  await fs.writeFile(OUTPUT_PATH, `${latestSerialized}\n`, "utf8");
  console.log(`Updated ${OUTPUT_PATH} with ${latest.length} exam rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});