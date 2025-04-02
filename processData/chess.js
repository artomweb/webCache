const { formatDate, timeago, findLineByLeastSquares } = require("./helpers.js");
const _ = require("lodash");

const processChessData = (data) => {
  data.forEach((elt) => {
    elt.startTime = +elt.startTime * 1000;
    const date = new Date(+elt.startTime);
    elt.Date = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
    elt.gameLength = +elt.gameLength;
  });

  // Sort data by start time
  data = _.sortBy(data, "startTime");

  // Calculate highest rating per day
  const dataByDay = _.chain(data)
    .groupBy((d) => d.Date)
    .map((entries, day) => {
      const highest = _.maxBy(entries, (entry) => +entry.myRating);
      return {
        startTime: highest.startTime,
        day,
        highest: +highest.myRating,
      };
    })
    .sortBy("startTime")
    .value();

  // Array of hours from 00 to 23 for each hour of the day
  const hoursOfDay = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

  // Group data by hour for win % calculation
  const byHour = _.chain(data)
    .groupBy((d) => {
      const date = new Date(+d.startTime);
      return date.getHours().toString().padStart(2, "0");
    })
    .map((entries, hour) => {
      const winPercent =
        Math.round(
          (entries.filter((e) => e.myResult === "win").length /
            entries.length) *
            1000
        ) / 10;
      const avgAccuracy =
        entries.reduce((sum, entry) => sum + +entry.myAccuracy, 0) /
        entries.length;
      return {
        hour: +hour,
        winPercent,
        avgAccuracy: Math.round(avgAccuracy * 10) / 10, // Rounded to 1 decimal place
      };
    })
    .sortBy("hour")
    .value();

  // Ensure data exists for each hour of the day
  const completedByTimeOfDay = _.map(hoursOfDay, (hour) => {
    const existingHourData = byHour.find(
      (item) => item.hour === parseInt(hour)
    );
    return existingHourData || { hour: +hour, winPercent: 0, avgAccuracy: 0 };
  });

  // Extract labels, win % data, and accuracy data by hour
  const labelsByHour = completedByTimeOfDay.map((item) => item.hour);
  const dataByHour = completedByTimeOfDay.map((item) => item.winPercent);
  const accuracyByHour = completedByTimeOfDay.map((item) => item.avgAccuracy);

  const pointRadiusArray = completedByTimeOfDay.map((item) =>
    item.winPercent !== 0 ? 3 : 0
  );

  const accpointRadiusArray = completedByTimeOfDay.map((item) =>
    item.avgAccuracy !== 0 ? 3 : 0
  );

  // Calculate the date of last game and display it
  const dateOfLastGame = new Date(data[data.length - 1].startTime);
  const formattedDate = formatDate(dateOfLastGame);
  const dateOfLastTestMessage = `${formattedDate} (${timeago(dateOfLastGame)})`; // REMOVE

  // Calculate highest rating and game statistics
  const highestRating = _.maxBy(data, "myRating").myRating;
  const numGames = data.length;

  const ratings = data.map((game) => +game.myRating);
  const trend = findLineByLeastSquares(ratings);
  const ratingChange = trend[1][1] - trend[0][1];

  const delta = _.sumBy(data, "gameLength");
  const changeInScorePerHourSigned = (ratingChange * (3600 / delta)).toFixed(2);
  const PorNchange = changeInScorePerHourSigned > 0 ? "+" : "-";
  const changeInScorePerHour = Math.abs(changeInScorePerHourSigned);
  const timeMessage = Math.round(delta / (60 * 60)) + " hours";

  // Build the result object
  return {
    highestRating,
    numGames,
    timeMessage,
    changeInScorePerHour: PorNchange + changeInScorePerHour,
    timeSinceLastGame: dateOfLastTestMessage,
    gameStatsByHour: {
      labelsByHour,
      dataByHour,
      accuracyByHour,
      pointRadiusArray,
      accpointRadiusArray,
    },
    dataByDay: {
      labels: dataByDay.map((elt) => elt.day),
      graphData: dataByDay.map((elt) => +elt.highest),
    },
    dateOfLastGame: dateOfLastGame.getTime(),
  };
};

module.exports = processChessData;
