const { formatDate, timeago, findLineByLeastSquares } = require("./helpers.js");
const _ = require("lodash");

const updateTypingData = (dataIn) => {
  // Map and process the input data
  dataIn = dataIn.map((elt) => {
    elt.timestamp = new Date(+elt.timestamp);
    elt.wpm = +elt.wpm;
    return elt;
  });

  // Sort data by timestamp
  const sortedData = _.sortBy(dataIn, (point) => point.timestamp.getTime());

  const hoursOfDay = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

  // Group by hour of the day
  const byTimeOfDay = _.chain(sortedData)
    .groupBy((d) => d.timestamp.getHours())
    .map((entries, hour) => ({
      hour: +hour,
      avg: Math.round(_.meanBy(entries, (entry) => +entry.wpm) * 10) / 10,
    }))
    .sortBy("hour")
    .value();

  // Prepare the hourly data with missing hours filled with 0
  const completedByTimeOfDay = hoursOfDay.map((hour) => {
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

  // Group data by month and year
  const weekAvg = _.chain(sortedData)
    .groupBy((d) => {
      const date = new Date(d.timestamp);
      return (
        date.toLocaleString("default", { month: "short" }) +
        " " +
        date.getFullYear()
      );
    })
    .map((entries, week) => ({
      dt: entries[0].timestamp,
      wofy: week,
      avg: Math.round(_.meanBy(entries, (entry) => +entry.wpm) * 10) / 10,
    }))
    .sortBy("dt")
    .value();

  const labels = weekAvg.map((el) => el.wofy);
  const data = weekAvg.map((el) => el.avg);

  // Get the maximum WPM
  const maxWPM = +_.maxBy(sortedData, "wpm").wpm + " wpm";

  // Only keep the last 500 data points
  const dataRecent = sortedData.slice(-500);

  // Calculate speed change per hour
  const wpmPoints = dataRecent.map((point) => +point.wpm);
  const trend = findLineByLeastSquares(wpmPoints);
  const wpmChange = trend[1][1] - trend[0][1];

  const delta = dataRecent.length * 30;
  const changeInWPMPerMinSigned = (wpmChange * (3600 / delta)).toFixed(2);
  const PorNchange = changeInWPMPerMinSigned > 0 ? "+" : "-";
  const changeInWPMPerMin =
    PorNchange + Math.abs(changeInWPMPerMinSigned) + " wpm";

  // Average WPM and Accuracy
  const avgWPM = _.meanBy(dataRecent, (o) => +o.wpm).toFixed(2) + " wpm";
  const avgACC =
    Math.round(
      _.meanBy(dataRecent, (o) => +o.acc),
      0
    ) + " %";

  // Time since last test
  const dateOfLastTest = formatDate(
    dataRecent[dataRecent.length - 1].timestamp
  );
  const dateOfLastTestMessage =
    dateOfLastTest +
    " (" +
    timeago(dataRecent[dataRecent.length - 1].timestamp) +
    ")";

  // Calculate tests per day
  const firstTest = dataRecent[0];
  const lastTest = dataRecent[dataRecent.length - 1];
  const dayDiff =
    (lastTest.timestamp - firstTest.timestamp) / (1000 * 60 * 60 * 24);
  const testsPerDay = (dataRecent.length / dayDiff).toFixed(1);

  // Total time spent
  const totalTimeMessage =
    Math.round((dataIn.length * 30) / (60 * 60)) + " hours";

  // Return the processed data
  return {
    labels,
    data,
    timOfDayLabels,
    timOfDayData,
    pointRadiusArray,
    maxWPM,
    avgWPM,
    avgACC,
    dateOfLastTestMessage,
    dateOfLastTest: dataRecent[dataRecent.length - 1].timestamp.getTime(),
    testsPerDay,
    changeInWPMPerMin,
    totalTimeMessage,
  };
};

module.exports = updateTypingData;
