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

  const result = {
    fastestTime: fastest.Time,
    bestPosition: bestPosition["Overall Position"],
    events: events,
    runCount: runCount,
  };

  return result;
}

module.exports = process5k;
