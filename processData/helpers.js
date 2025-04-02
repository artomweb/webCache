const gradeRanking = {
  VB: 0,
  V0: 1,
  V1: 3,
  V2: 4,
  V3: 5,
  V4: 6,
  V5: 7,
  V6: 8,
  V7: 9,
  V8: 10,
  V9: 11,
};

const formatDate = (dateString) => {
  const date = new Date(dateString);

  // Get the day and month
  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "long" });

  // Use the provided getOrdinalSuffix function
  const suffix = getOrdinalSuffix(day);

  return `${day}${suffix} of ${month}`;
};

const timeago = (inputDate) => {
  const currentDate = new Date();

  // Clear the time part of both dates for comparison
  inputDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);

  // Get the difference in milliseconds
  const diffTime = currentDate - inputDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Calculate time differences for weeks, months, and years
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths =
    (currentDate.getFullYear() - inputDate.getFullYear()) * 12 +
    (currentDate.getMonth() - inputDate.getMonth());
  const diffYears = currentDate.getFullYear() - inputDate.getFullYear();

  if (diffDays === 0) {
    return "today";
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays > 1 && diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffWeeks >= 1 && diffWeeks < 5) {
    return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  } else if (diffMonths >= 1 && diffMonths < 12) {
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  } else if (diffYears >= 1) {
    return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
  }
};

const parseDate = (dateStr) => {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day); // Months are zero-based
};

const getOrdinalSuffix = (day) => {
  if (day > 3 && day < 21) return "th"; // Covers 11th-13th
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

// https://github.com/monkeytypegame/monkeytype
const findLineByLeastSquares = (values_y) => {
  let sum_x = 0;
  let sum_y = 0;
  let sum_xy = 0;
  let sum_xx = 0;
  let count = 0;

  let x = 0;
  let y = 0;
  const values_length = values_y.length;

  if (values_length === 0) {
    return [[], []];
  }

  for (let v = 0; v < values_length; v++) {
    x = v + 1;
    y = values_y[v];
    sum_x += x;
    sum_y += y;
    sum_xx += x * x;
    sum_xy += x * y;
    count++;
  }

  const m = (count * sum_xy - sum_x * sum_y) / (count * sum_xx - sum_x * sum_x);
  const b = sum_y / count - (m * sum_x) / count;

  const returnpoint1 = [1, 1 * m + b];
  const returnpoint2 = [values_length, values_length * m + b];
  return [returnpoint1, returnpoint2];
};
module.exports = {
  gradeRanking,
  parseDate,
  formatDate,
  timeago,
  findLineByLeastSquares,
};
