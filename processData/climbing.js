const { gradeRanking, parseDate, formatDate, timeago } = require("./helpers.js");

const _ = require("lodash");

const processClimbingData = (data) => {
  // Map and process data
  data = data.map((d) => {
    d.Grade = d.Grade.split("+")[0];
    d.numericGrade = gradeRanking[d.Grade] || 0;
    d.DateJS = parseDate(d.Date);
    return d;
  });

  const highestGrade = _.maxBy(data, "numericGrade").Grade;

  // Group data by day
  const groupedByDay = _.groupBy(data, "Date");

  // Calculate routes metrics
  const routes = _.mapValues(groupedByDay, (climbs) => {
    const flashes = _.filter(climbs, (climb) => climb.Success === true && climb.Attempts === 1);
    const successes = _.filter(climbs, (climb) => climb.Success === true);
    const attempts = _.sumBy(climbs, (climb) => +climb.Attempts);
    const bestGrade = _.maxBy(climbs, "numericGrade").Grade;

    return {
      flashes: flashes.length,
      successes: successes.length,
      attempts,
      bestGrade,
    };
  });

  // Sort routes by date
  const sortedRoutes = _.pick(
    routes,
    Object.keys(routes).sort((a, b) => parseDate(a) - parseDate(b))
  );

  const labels = _.map(_.keys(sortedRoutes), (d) => parseDate(d));
  const N = 10;
  const latestLabels = labels.slice(-N);
  const lastClimbDate = _.last(latestLabels);
  const formattedDate = formatDate(lastClimbDate);
  const timeSinceLastClimb = `${formattedDate} (${timeago(lastClimbDate)})`;

  const attempts = Object.values(sortedRoutes)
    .slice(-N)
    .map((route) => route.attempts);
  const successes = Object.values(sortedRoutes)
    .slice(-N)
    .map((route) => route.successes);
  const flashes = Object.values(sortedRoutes)
    .slice(-N)
    .map((route) => route.flashes);
  const bestGrade = Object.values(sortedRoutes)
    .slice(-N)
    .map((route) => route.bestGrade);

  // Calculate totals by grade
  const gradeTotals = {};
  Object.values(groupedByDay).forEach((climbsOnDate) => {
    climbsOnDate.forEach((climb) => {
      const { Grade, Attempts, Success, numericGrade } = climb;

      if (!gradeTotals[Grade]) {
        gradeTotals[Grade] = {
          attempts: 0,
          successes: 0,
          flashes: 0,
          numericGrade,
        };
      }

      gradeTotals[Grade].attempts += Attempts;
      if (Success) {
        if (Attempts === 1) {
          gradeTotals[Grade].flashes += 1;
        }
        gradeTotals[Grade].successes += 1;
      }
    });
  });

  const sortedGrades = Object.fromEntries(Object.entries(gradeTotals).sort(([, a], [, b]) => a.numericGrade - b.numericGrade));

  const byGradeLabels = _.keys(sortedGrades);
  const byGradeAttempts = Object.values(sortedGrades).map((route) => route.attempts);
  const byGradeSuccesses = Object.values(sortedGrades).map((route) => route.successes);
  const byGradeFlashes = Object.values(sortedGrades).map((route) => route.flashes);

  return {
    highestGrade,
    climbingSessions: _.keys(groupedByDay).length,
    timeSinceLastClimb,
    lastClimbDate: lastClimbDate.getTime(),
    running: {
      latestLabels,
      attempts,
      successes,
      flashes,
      bestGrade,
    },
    byGrade: {
      byGradeLabels,
      byGradeAttempts,
      byGradeSuccesses,
      byGradeFlashes,
    },
  };
};

module.exports = processClimbingData;
