const express = require("express");
const app = express();
const { google } = require("googleapis");
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
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const cors = require("cors");
const { createClient } = require("redis");

let redis = null;
const includeSolar = process.env.INCLUDE_SOLAR === "true";

if (includeSolar) {
  const { createClient } = require("redis");
  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  redisClient.on("error", (err) => console.error("Redis Client Error:", err));

  redisClient
    .connect()
    .then(() => console.log("Connected to Redis"))
    .catch((err) => console.error("Failed to connect to Redis:", err));
}

if (includeSolar) {
  const Redis = require("ioredis");
  redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
}

const isLocalhost = process.env.NODE_ENV === "development";
if (isLocalhost) {
  app.use(cors());
  console.log("CORS enabled for localhost");
}

const dataStore = {};
let lastUpdateTime = null;

function parseArrayToJson(data) {
  const headers = data[0];
  const jsonData = data.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      let value = row[index] || "";
      if (typeof value === "string") {
        if (value.toUpperCase() === "TRUE") {
          value = true;
        } else if (value.toUpperCase() === "FALSE") {
          value = false;
        }
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
    if (obj.StartDateEpoch) {
      obj.jsDate = new Date(obj.StartDateEpoch * 1000).toISOString();
    }
    return obj;
  });
  return jsonData;
}

// Configure Google Sheets API client
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "./account.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

// Combined configuration object
const dataConfigs = {
  k5: {
    spreadsheetId: process.env.K5_SPREADSHEET_ID,
    range: "Sheet1!A1:Z",
    processFunc: process5k,
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

// Route handler
app.get("/:cacheKey", async (req, res) => {
  const cacheKey = req.params.cacheKey;

  if (cacheKey === "all") {
    const result = { ...dataStore };

    if (includeSolar && redisClient) {
      try {
        const solarRaw = await redisClient.get("latestData");
        result.solar = solarRaw ? JSON.parse(solarRaw) : null;
      } catch (err) {
        console.error("Error fetching solar data from Redis:", err);
        result.solar = { error: true, message: "Failed to fetch from Redis" };
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
    if (data) {
      res.json(data);
    } else {
      res.status(404).send("Data not found");
    }
  }
});

// Fetch and process each data set
async function fetchDataAndStore() {
  for (const [key, config] of Object.entries(dataConfigs)) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: config.range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error("No data found");
      }

      const jsonData = parseArrayToJson(rows);
      const processedData = config.processFunc(jsonData);

      if (!processedData) {
        throw new Error("No data found");
      }

      dataStore[key] = {
        data: processedData,
        error: false,
      };
      console.log(`Data for ${key} updated successfully.`);
    } catch (error) {
      console.error(`Error fetching or processing data for ${key}:`, error);
      dataStore[key] = {
        data: null,
        error: true,
      };
    }
  }

  lastUpdateTime = new Date().toISOString();
  console.log(`Data updated at ${lastUpdateTime}`);
}

// Test function
async function testFunction(key) {
  const config = dataConfigs[key];
  if (!config) {
    console.error(`No config found for key: ${key}`);
    console.log("Available keys:", Object.keys(dataConfigs).join(", "));
    return;
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: config.range,
    });

    const rows = response.data.values;
    const jsonData = parseArrayToJson(rows);
    console.log(rows);
    console.log(jsonData);
    const result = await config.processFunc(jsonData);
    console.log(`${key} Processing Result:`);
    console.log(result);
  } catch (error) {
    console.error(`Error testing ${key}:`, error);
  }
}

// Startup logic
const testFlag = process.argv[2];
const testKey = process.argv[3];
if (testFlag === "--test" && testKey) {
  console.log("TESTING", testKey);
  testFunction(testKey)
    .then(() => {
      console.log("Test complete");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Test failed:", err);
      process.exit(1);
    });
} else {
  fetchDataAndStore();
  setInterval(fetchDataAndStore, 10 * 60 * 60 * 1000);
  app.listen(2036, () => console.log("App Listening on port 2036"));
}
