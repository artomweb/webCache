const _ = require("lodash");

function process5k(data) {
  const timeToSeconds = (timeStr) => {
    const [minutes, seconds] = timeStr.split(":").map(Number);
    return minutes * 60 + seconds;
  };

  // Parse dates in DD/MM/YYYY format
  const parseDate = (dateStr) => {
    const [day, month, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day); // JS months are 0-indexed
  };

  // Fastest time
  const fastest = _.minBy(data, (d) => timeToSeconds(d.Time));

  // Best overall position
  const bestPosition = _.minBy(data, "Overall Position");

  // Unique list of event names
  const events = _.uniq(data.map((d) => d.Event));

  // Number of runs
  const runCount = data.length;

  // Parse all run dates
  const runDates = data.map((d) => parseDate(d["Run Date"]));
  // console.log(runDates);

  // Last run date
  const lastRunDate = _.maxBy(runDates, (date) => date.getTime()).getTime();

  const result = {
    fastestTime: fastest.Time,
    bestPosition: bestPosition["Overall Position"],
    events: events,
    runCount: runCount,
    lastRunDate: lastRunDate,
  };

  // console.log(result);
  return result;
}

module.exports = process5k;
