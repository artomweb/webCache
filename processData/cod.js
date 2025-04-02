const { formatDate, timeago } = require("./helpers.js");
const _ = require("lodash");

const processCodData = (allGames) => {
  const hourlyData = {}; // Stores hourly statistics
  const winCountsByDate = {}; // Stores daily win counts
  const data = []; // Stores processed data for normal and running views
  const winCountsByIndex = {};

  // --- Step 1: Iterate over all games to build hourlyData and winCountsByDate ---
  allGames.forEach((game) => {
    const date = new Date(+game.UnixTimestamp * 1000);
    const hour = date.getHours();
    const formattedDate = date.toLocaleDateString("en-GB");

    // Process hourly statistics
    if (!hourlyData[hour]) {
      hourlyData[hour] = { A: 0, B: 0, total: 0 };
    }
    if (game.Winner === "A") hourlyData[hour].A++;
    if (game.Winner === "B") hourlyData[hour].B++;
    hourlyData[hour].total++;

    // Process daily win counts and game details
    if (!winCountsByDate[formattedDate]) {
      winCountsByDate[formattedDate] = { A: 0, B: 0, games: [] };
    }
    const dailyStats = winCountsByDate[formattedDate];
    dailyStats.games.push(game.Winner);

    if (game.Winner === "A") dailyStats.A++;
    if (game.Winner === "B") dailyStats.B++;

    // Process win counts by game index
    const gameIndex = dailyStats.games.length; // 1-based index of the game in the day
    if (!winCountsByIndex[gameIndex]) {
      winCountsByIndex[gameIndex] = { A: 0, B: 0, total: 0 };
    }
    const indexStats = winCountsByIndex[gameIndex];
    if (game.Winner === "A") indexStats.A++;
    if (game.Winner === "B") indexStats.B++;
    indexStats.total++;
  });

  let indices = [];
  const winPercentagesByIndexA = [];
  const winPercentagesByIndexB = [];

  for (const index in winCountsByIndex) {
    const { A, B, total } = winCountsByIndex[index];
    winPercentagesByIndexA[index - 1] =
      total > 0 ? Math.round((A / total) * 100) : 0;
    winPercentagesByIndexB[index - 1] =
      total > 0 ? Math.round(-(B / total) * 100) : 0;
    indices[index - 1] = parseInt(index, 10);
  }

  const gameIndexView = {
    winPercentagesByIndexA,
    winPercentagesByIndexB,
    indices,
  };

  // --- Step 2: Calculate hourly view data ---
  const hours = [];
  const winPercentagesA = [];
  const winPercentagesB = [];

  for (let hour = 0; hour < 24; hour++) {
    const stats = hourlyData[hour] || { A: 0, B: 0, total: 0 };
    const percentageA = stats.total > 0 ? (stats.A / stats.total) * 100 : 0;
    const percentageB = stats.total > 0 ? (stats.B / stats.total) * 100 : 0;

    hours.push(hour);
    winPercentagesA.push(Math.round(percentageA));
    winPercentagesB.push(Math.round(-percentageB));
  }

  const hourlyView = { winPercentagesA, winPercentagesB, hours };

  // --- Step 3: Prepare daily view data ---
  for (const date in winCountsByDate) {
    const { A, B } = winCountsByDate[date];
    const [day, month, year] = date.split("/").map(Number);
    const jsDate = new Date(year, month - 1, day);

    data.push({ Date: date, Archie: A, Ben: B, jsDate });
  }

  const dataArchie = data.map((e) => e.Archie);
  const dataBen = data.map((e) => -e.Ben);
  const labels = data.map((e) => e.Date);
  const normalView = { dataArchie, dataBen, labels };

  // --- Step 4: Calculate running totals ---
  let runningTotal = 0;
  data.forEach((day) => {
    runningTotal += day.Archie - day.Ben;
    day.runningTotal = runningTotal;
  });

  const runningData = data.map((e) => e.runningTotal);
  const runningView = { runningData, labels };

  // --- Step 5: Calculate totals and last game date ---
  const totalArchie = _.sumBy(data, "Archie");
  const totalBen = _.sumBy(data, "Ben");

  const lastDateString = data[data.length - 1]?.Date || "01/01/1970";
  const [lastDay, lastMonth, lastYear] = lastDateString.split("/").map(Number);
  const dateOfLastTest = new Date(lastYear, lastMonth - 1, lastDay, 8, 0, 0, 0);

  const formattedDate = formatDate(dateOfLastTest);
  const dateOfLastTestMessage = `${formattedDate} (${timeago(
    data[data.length - 1]?.jsDate || new Date()
  )})`; // MARK FOR REMOVAL

  // --- Return results ---
  return {
    totalArchie,
    totalBen,
    hourlyView,
    normalView,
    runningView,
    gameIndexView,
    dateOfLastTestMessage,
    dateOfLastTest: dateOfLastTest.getTime(),
  };
};

module.exports = processCodData;
