const _ = require("lodash");
const { formatDate, timeago, findLineByLeastSquares } = require("./helpers.js");

const processDobbleData = (dataIn) => {
  let totalTime = 0;

  // Process the input data
  dataIn.forEach((elt) => {
    elt.timestamp = new Date(+elt.unix * 1000);
    elt.score = +elt.score;
    totalTime += +elt.testTime;
  });

  const numTests = dataIn.length;

  // Calculate weekly average scores
  const weekAvg = _.chain(dataIn)
    .groupBy((d) => {
      const date = new Date(d.timestamp);
      return new Intl.DateTimeFormat("en-GB", {
        month: "short",
        year: "2-digit",
      }).format(date);
    })
    .map((entries, mofy) => {
      return {
        mofy,
        avg: Math.round(_.meanBy(entries, (entry) => entry.score) * 10) / 10,
      };
    })
    .value();

  const labels = weekAvg.map((el) => el.mofy);
  const data = weekAvg.map((el) => el.avg);

  // Calculate average scores by time of day
  const hoursOfDay = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

  const byTimeOfDay = _.chain(dataIn)
    .groupBy((d) => {
      const date = new Date(d.timestamp);
      return date.getHours().toString().padStart(2, "0"); // Format hour as "HH"
    })
    .map((entries, hour) => {
      return {
        hour: +hour,
        avg: Math.round(_.meanBy(entries, (entry) => +entry.score) * 10) / 10,
      };
    })
    .sortBy((d) => d.hour)
    .value();

  const completedByTimeOfDay = _.map(hoursOfDay, (hour) => {
    const existingHourData = byTimeOfDay.find(
      (item) => item.hour === parseInt(hour)
    );
    return existingHourData || { hour: +hour, avg: 0 };
  });

  const timOfDayLabels = completedByTimeOfDay.map((item) => item.hour);
  const timOfDayData = completedByTimeOfDay.map((item) => item.avg);

  const pointRadiusArray = completedByTimeOfDay.map((item) =>
    item.avg !== 0 ? 3 : 0
  );

  // Calculate trend and score change per minute
  const scorePoints = dataIn.map((point) => +point.score);
  const trend = findLineByLeastSquares(scorePoints);

  const scoreChange = trend[1][1] - trend[0][1];
  const delta = dataIn.length * 60;
  const changeInScorePerMinSigned = (scoreChange * (3600 / delta)).toFixed(2);
  const PorNchange = changeInScorePerMinSigned > 0 ? "+" : "-";
  const changeInScorePerMin = Math.abs(changeInScorePerMinSigned);

  const maxScore = _.maxBy(dataIn, "score").score;
  const timeMessage = Math.round(totalTime / (60 * 60)) + " hours";

  // Get date of last test
  const lastTimestamp = dataIn[dataIn.length - 1].timestamp;
  const dateOfLastTest = formatDate(lastTimestamp);
  const dateOfLastTestMessage =
    dateOfLastTest +
    " (" +
    timeago(new Date(+dataIn[dataIn.length - 1].timestamp)) +
    ")";

  return {
    labels,
    data,
    timOfDayLabels,
    timOfDayData,
    pointRadiusArray,
    timeMessage,
    maxScore,
    numTests,
    dateOfLastTestMessage,
    lastTimestamp: lastTimestamp.getTime(),
    scoreChangePerMin: PorNchange + changeInScorePerMin,
  };
};

module.exports = processDobbleData;
