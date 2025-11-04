const express = require("express");
const app = express();
const { google } = require("googleapis");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const cors = require("cors");
const { createClient } = require("redis");

// Import processing modules
const process5k = require("./processData/5k.js");
const processClimbing = require("./processData/climbing.js");
const processCOD = require("./processData/cod.js");
const processChess = require("./processData/chess.js");
const processDobble = require("./processData/dobble.js");
const processDriving = require("./processData/driving.js");
const processSpotify = require("./processData/spotify.js");
const processTyping = require("./processData/typing.js");
const processDuo = require("./processData/duo.js");
const processPushups = require("./processData/pushups.js");
const processParkrun = require("./processData/parkrun.js");
const processPullups = require("./processData/pullups.js");

const includeSolar = process.env.INCLUDE_SOLAR === "true";

// Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("Redis Client Error:", err));

redisClient
  .connect()
  .then(() => console.log("Connected to Redis"))
  .catch((err) => console.error("Failed to connect to Redis:", err));

// Enable CORS in development
if (process.env.NODE_ENV === "development") {
  app.use(cors());
  console.log("CORS enabled for localhost");
}

// In-memory cache
const dataStore = {};
let lastUpdateTime = null;

// Convert Google Sheets array to JSON
function parseArrayToJson(data) {
  const headers = data[0];
  return data.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      let value = row[index] || "";
      if (typeof value === "string") {
        if (value.toUpperCase() === "TRUE") value = true;
        else if (value.toUpperCase() === "FALSE") value = false;
      }
      if (
        header !== "SplitsMetric" &&
        typeof value === "string" &&
        value !== "" &&
        !isNaN(value)
      ) {
        value = Number(value);
      }
      if (header === "SplitsMetric" && value) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.error(`Error parsing SplitsMetric: ${e.message}`);
        }
      }
      obj[header] = value;
    });
    if (obj.StartDateEpoch)
      obj.jsDate = new Date(obj.StartDateEpoch * 1000).toISOString();
    return obj;
  });
}

// Google Sheets client
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "./account.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

// Dataset configuration
const dataConfigs = {
  pullups: {
    spreadsheetId: process.env.PULLUPS_SPREADSHEET_ID,
    range: "Sheet1!A1:Z",
    processFunc: processPullups,
  },
  k5: {
    spreadsheetId: process.env.K5_SPREADSHEET_ID,
    range: "Sheet1!A1:Z",
    processFunc: process5k,
  },
  parkrun: {
    spreadsheetId: process.env.PARKRUN_SPREADSHEET_ID,
    range: "Sheet1!A1:Z",
    processFunc: processParkrun,
  },
  driving: {
    spreadsheetId: process.env.DRIVING_SPREADSHEET_ID,
    range: "Sheet1!A1:Z",
    processFunc: processDriving,
  },
  spotify: {
    spreadsheetId: process.env.SPOTIFY_SPREADSHEET_ID,
    range: "Sheet1!A1:Z",
    processFunc: processSpotify,
  },
  chess: {
    spreadsheetId: process.env.CHESS_SPREADSHEET_ID,
    range: "Sheet1!A1:Z",
    processFunc: processChess,
  },
  duolingo: {
    spreadsheetId: process.env.DUOLINGO_SPREADSHEET_ID,
    range: "Sheet1!A1:Z",
    processFunc: processDuo,
  },
  climbing: {
    spreadsheetId: process.env.CLIMBING_SPREADSHEET_ID,
    range: "DetailedRoutes!A1:Z",
    processFunc: processClimbing,
  },
  COD: {
    spreadsheetId: process.env.COD_SPREADSHEET_ID,
    range: "AllGames!A1:Z",
    processFunc: processCOD,
  },
  dobble: {
    spreadsheetId: process.env.DOBBLE_SPREADSHEET_ID,
    range: "60!A1:Z",
    processFunc: processDobble,
  },
  typing: {
    spreadsheetId: process.env.TYPING_SPREADSHEET_ID,
    range: "Sheet1!A1:Z",
    processFunc: processTyping,
  },
  pushups: {
    spreadsheetId: process.env.PUSHUPS_SPREADSHEET_ID,
    range: "Sheet1!A1:Z",
    processFunc: processPushups,
  },
};

// Express routes
app.get("/:cacheKey", async (req, res) => {
  const cacheKey = req.params.cacheKey;

  if (cacheKey === "all") {
    const result = { ...dataStore };

    if (includeSolar && redisClient) {
      try {
        const solarRaw = await redisClient.get("vedirect:latest");
        const solarData = solarRaw ? JSON.parse(solarRaw) : null;
        result.solar = solarData
          ? { V: solarData.V, I: solarData.I, PPV: solarData.PPV }
          : null;

        const statsRaw = await redisClient.get("server_stats");
        result.serverStats = statsRaw ? JSON.parse(statsRaw) : null;
      } catch (err) {
        console.error("Error fetching Redis data:", err);
        result.solar = { error: true, message: "Failed to fetch solar data" };
        result.serverStats = {
          error: true,
          message: "Failed to fetch server stats",
        };
      }
    }

    res.json(result);
  } else if (cacheKey === "updated") {
    res.send(
      lastUpdateTime
        ? `Last updated at: ${lastUpdateTime}`
        : "Data has not been updated yet"
    );
  } else {
    const data = dataStore[cacheKey];
    data ? res.json(data) : res.status(404).send("Data not found");
  }
});

// Load cache from Redis
async function loadCache() {
  try {
    const raw = await redisClient.get("dataStore");
    const time = await redisClient.get("lastUpdateTime");
    if (raw) {
      Object.assign(dataStore, JSON.parse(raw));
      lastUpdateTime = time || null;
      console.log("Cache loaded from Redis");
    }
  } catch (e) {
    console.error("Error loading cache from Redis:", e);
  }
}

// Save cache to Redis
async function saveCache() {
  try {
    await redisClient.set("dataStore", JSON.stringify(dataStore));
    await redisClient.set("lastUpdateTime", lastUpdateTime || "");
    console.log("Cache saved to Redis");
  } catch (e) {
    console.error("Error saving cache to Redis:", e);
  }
}

// Fetch a single dataset
async function fetchSingleDataset(key, config) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: config.range,
    });
    const rows = response.data.values;
    if (!rows || rows.length === 0) throw new Error("No data found");

    const jsonData = parseArrayToJson(rows);
    const processedData = config.processFunc(jsonData);

    dataStore[key] = { data: processedData, error: false };
    lastUpdateTime = new Date().toISOString();

    // Clean temporary objects
    processedData = null;
  } catch (error) {
    console.error(`Error fetching ${key}: ${error.message}`);
    if (!dataStore[key] || dataStore[key].error)
      dataStore[key] = { data: null, error: true };
  }
}

// Fetch all datasets and save cache
async function fetchDataAndStore() {
  const promises = Object.entries(dataConfigs).map(([key, config]) =>
    fetchSingleDataset(key, config)
  );
  await Promise.all(promises);
  await saveCache();
}

// Startup
(async () => {
  await loadCache(); // Load last good data
  fetchDataAndStore(); // Initial fetch
  setInterval(fetchDataAndStore, 30 * 60 * 1000); // Fetch every 30 minutes
  app.listen(2036, () => console.log("App listening on port 2036"));
})();
