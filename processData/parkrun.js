const _ = require("lodash");

function process5k(data) {
  const timeToSeconds = (timeStr) => {
    const [minutes, seconds] = timeStr.split(":").map(Number);
    return minutes * 60 + seconds;
  };
  const fastest = _.minBy(data, (d) => timeToSeconds(d.Time));

  // Best overall position
  const bestPosition = _.minBy(data, "Overall Position");
  const events = data.map((d) => d.Event);

  const result = {
    fastestTime: fastest.Time,
    bestPosition: bestPosition["Overall Position"],
    events: events,
  };

  console.log(result);
  return result;
}

module.exports = process5k;
