import type { Arguments, CommandBuilder } from "yargs";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import {
  fullLists,
  PlaywrightBlocker,
  Request,
} from "@cliqz/adblocker-playwright";
import fetch from "cross-fetch";
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

type Options = {
  name: string;
};

export const command: string = "fetch <page>";
export const desc: string = "Fetch <page> and display contents";

export const builder: CommandBuilder<Options, Options> = (yargs) => {
  return yargs.positional("page", { type: "string", demandOption: true });
};

export const handler = (argv: Arguments<Options>): void => {
  const { page } = argv;

  task(page as string);
};

chromium.use(stealth());

const scroll = async (args: { direction: string; speed: string }) => {
  const { direction, speed } = args;
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const scrollHeight = () => document.body.scrollHeight;
  const start = direction === "down" ? 0 : scrollHeight();
  const shouldStop = (position: number) =>
    direction === "down" ? position > scrollHeight() : position < 0;
  const increment = direction === "down" ? 100 : -100;
  const delayTime = speed === "slow" ? 150 : 10;
  console.error(start, shouldStop(start), increment);
  for (let i = start; !shouldStop(i); i += increment) {
    window.scrollTo(0, i);
    await delay(delayTime);
  }
};

// Main entry
const task = async (entry: string) => {
  const browser = await chromium.launch({
    headless: false,
    timeout: 100000,
    args: [
      // "--disable-background-media-suspend",
      // "--disable-backgrounding-occluded-windows",
      // "--autoplay-policy=no-user-gesture-required",
      // "--no-sandbox",
      // "--disable-site-isolation-trials",
      "--auto-open-devtools-for-tabs",
    ],
  });
  const page = await browser.newPage();

  PlaywrightBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    blocker.enableBlockingInPage(page);
  });

  // Open file io to write data
  const csvWriter = createCsvWriter({
    path: "results.csv",
    header: [
      { id: "picture", title: "PICTURE" },
      { id: "link", title: "LINK" },
      { id: "name", title: "NAME" },
      { id: "title", title: "TITLE" },
      { id: "ratingScore", title: "RATINGSCORE" },
      { id: "ratingCount", title: "RATINGCOUNT" },
      { id: "price", title: "PRICE" },
    ],
  });

  // We know there are 20 pages in total
  for (let i = 1; i <= 20; i++) {
    await page.goto(
      `https://www.fiverr.com/categories/programming-tech/buy/website-development/portfolio?source=pagination&ref=website_type%3Aportfolio&page=${i}`
    );

    await page.evaluate(scroll, { direction: "down", speed: "slow" });

    console.log(`crawling page ${i}...`);

    const gigs = await page.locator("div[class=basic-gig-card]").all();

    for (const gig of gigs) {
      const picture = await gig.evaluate(
        (div) => div.children[0].querySelectorAll("img")[0].src
      );
      const link = await gig.evaluate(
        (div) => (div.children[0] as HTMLAnchorElement).href
      );
      const name = await gig.evaluate((div) =>
        (div.children[2].children[0] as HTMLElement).innerText.substring(2)
      );
      const title = await gig.evaluate(
        (div) => (div.children[3] as HTMLElement).innerText
      );
      const ratingScore = await gig.evaluate(
        (div) =>
          (div.children[4].querySelector(".rating-score") as HTMLElement)
            ?.innerText
      );
      const ratingCount = await gig.evaluate(
        (div) =>
          (div.children[4].querySelector(".ratings-count") as HTMLElement)
            ?.innerText
      );
      const price = await gig.evaluate((div) =>
        (div.children[5] as HTMLElement)?.innerText?.substring(6)
      );

      const data = [
        {
          picture,
          link,
          name,
          title,
          ratingScore,
          ratingCount,
          price,
        },
      ];

      await csvWriter.writeRecords(data);
    }
  }

  await browser.close();
};
