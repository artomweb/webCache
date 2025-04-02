const { formatDate, timeago } = require("./helpers.js");
const _ = require("lodash");

const processDrivingData = (data) => {
  // Calculate total miles and total time spent driving
  const totalMiles = _.sumBy(data, (o) => +o.totalMiles);
  const totalSeconds = _.sumBy(data, (o) => +o.totalSeconds);

  const timeSpentDriving = Math.round(totalSeconds / (60 * 60)) + " hours";
  const milesDriven =
    totalMiles.toLocaleString(undefined, {
      minimumFractionDigits: 2,
    }) + " miles";

  // Sort data by start timestamp in descending order
  const sortedData = data.sort((a, b) => b.startTimestamp - a.startTimestamp);

  // Process the date of the last drive
  const endTimestamp = sortedData[0].endTimestamp / 1000; // Convert to seconds
  const date = new Date(endTimestamp * 1000); // Create a Date object
  const dateOfLastDrive = formatDate(date);

  const dateOfLastDriveMessage =
    dateOfLastDrive +
    " (" +
    timeago(new Date(+sortedData[0].endTimestamp)) +
    ")";

  // Time able to drive (static driving pass date)
  const drivingPass = new Date(1626864660 * 1000);
  const timeDrivingMessage = timeago(drivingPass).replace(" ago", "");

  // Return the processed data
  return {
    timeSpentDriving,
    milesDriven,
    timeSinceLastDrive: dateOfLastDriveMessage,
    timeDriving: timeDrivingMessage,
    dateOfLastDrive: endTimestamp * 1000,
  };
};

module.exports = processDrivingData;
