const chromium = require("chrome-aws-lambda");
const AWS = require("aws-sdk");
require("dotenv").config();
AWS.config.update({ region: "ap-southeast-1" });

const s3 = new AWS.S3();

exports.handler = async (event, context, callback) => {
  let result = null;
  let browser = null;
  let url = null;

  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    let page = await browser.newPage();
    await page.goto(event.url || "https://blueprintcoc.com", {
      waitUntil: "networkidle2",
    });
    await page.waitForSelector("canvas");

    await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      canvas.style.left = "-200px";
    });

    const buffer = await page.screenshot();
    const params = {
      Bucket: `${process.env.S3BUCKET}`,
      Key: `${Date.now()}.png`,
      Body: buffer,
      ContentType: "image/png",
      ACL: "public-read",
    };

    result = await s3.putObject(params).promise();
    url = `${process.env.S3URL}${params.Key}`;
  } catch (error) {
    return callback(error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  return callback(null, url);
};
