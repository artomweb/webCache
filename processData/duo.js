const _ = require("lodash");
const { formatDate, timeago } = require("./helpers.js");

const processDuoData = (data) => {
  // Ensure numeric fields are converted from empty strings to 0
  data = data.map((item) => ({
    ...item,
    gainedXp: Number(item.gainedXp) || 0,
    numLessons: Number(item.numLessons) || 0,
    totalSessionTime: Number(item.totalSessionTime) || 0,
  }));
  // Sort data by date
  data = data.sort((a, b) => a.date - b.date);

  // Calculate duoTotal in hours
  const duoTotal = _.sumBy(data, "totalSessionTime");
  const duoTotalHours = Math.round(duoTotal / (60 * 60)) + " hours"; // in hours

  // Calculate total number of lessons
  const lessonTotal = _.sumBy(data, "numLessons");

  // Calculate streak of consecutive days going backwards from most recent entry
  let streak = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].numLessons > 0) {
      streak++;
    } else {
      break; // Stop counting if a day with no lessons is found
    }
  }

  // Parse and format the last lesson date
  const lastLessonDate = new Date(data[data.length - 1].date * 1000); // Convert timestamp to Date object
  const formattedDate = formatDate(lastLessonDate);
  const dateOfLastTestMessage = `${formattedDate} (${timeago(lastLessonDate)})`;

  // Prepare labels for graph plotting
  const labels = data.map((d) => new Date(d.date * 1000)); // Convert date field from UNIX timestamp to Date object
  const graphData = data.map(
    (item) => Math.max(1, Math.round(item.totalSessionTime / 60)) // Ensure session time is at least 1 minute
  );

  // Return the processed data
  return {
    duoTotal: duoTotalHours, // Total session time in hours
    duoLessons: lessonTotal, // Total lessons
    duoStreak: streak + " days", // Streak in days
    timeSinceLastDuo: dateOfLastTestMessage, // Last lesson date and time ago message
    graphData: {
      labels,
      graphData,
    },
    lastLessonDate: lastLessonDate.getTime(),
  };
};

module.exports = processDuoData;
