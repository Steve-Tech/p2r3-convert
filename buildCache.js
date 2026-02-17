import puppeteer from "puppeteer";

const server = Bun.serve({
  async fetch (req) {
    const path = new URL(req.url).pathname.replace("/convert/", "") || "index.html";
    const file = Bun.file(`${__dirname}/dist/${path}`);
    if (!(await file.exists())) return new Response("Not Found", { status: 404 });
    return new Response(file);
  },
  port: 8080
});

// The arm64 build on GitHub Actions is very slow
// lets increase the timeout to avoid hitting it
const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
  timeout: 1800_000
});

const page = await browser.newPage();

await Promise.all([
  new Promise(resolve => {
    page.on("console", msg => {
      const text = msg.text();
      if (text === "Built initial format list.") resolve();
    });
  }),
  page.goto("http://localhost:8080/convert/index.html")
]);

const cacheJSON = await page.evaluate(() => {
  return window.printSupportedFormatCache();
});
const outputPath = process.argv[2] || "cache.json";
await Bun.write(outputPath, cacheJSON);

await browser.close();
server.stop();
