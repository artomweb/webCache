const _ = require("lodash");

function process5k(data) {
  const timeToSeconds = (timeStr) => {
    const [minutes, seconds] = timeStr.split(":").map(Number);
    return minutes * 60 + seconds;
  };

  // Fastest time
  const fastest = _.minBy(data, (d) => timeToSeconds(d.Time));

  // Best overall position
  const bestPosition = _.minBy(data, "Overall Position");

  // Unique list of event names
  const events = _.uniq(data.map((d) => d.Event));

  // Number of runs
  const runCount = data.length;

  // Last parkrun date in milliseconds
  const lastRunDate = _.maxBy(
    data.map((d) => new Date(d["Run Date"])),
    (date) => date.getTime()
  ).getTime();

  const result = {
    fastestTime: fastest.Time,
    bestPosition: bestPosition["Overall Position"],
    events: events,
    runCount: runCount,
    lastRunDate: lastRunDate,
  };

  console.log(result);
  return result;
}

module.exports = process5k;
