const _ = require("lodash");

function processPullups(data) {
  data = data.map((d) => {
    const [day, month, year] = d.Date.split("/"); // Split the string into day, month, year
    d.jsDate = new Date(Date.UTC(year, month - 1, day));
    return d;
  });

  // Filter out invalid dates
  data = data.filter(
    (d) => d.Date && d.jsDate && !isNaN(new Date(d.jsDate).getTime())
  );

  // Training days: no MaxTest, but Total is filled
  const TrainingDays = data.filter(
    (item) => item.MaxTest === "" && item.Total !== ""
  );

  // Test days: MaxTest recorded and Total filled
  const TestDays = data.filter(
    (item) => item.MaxTest !== "" && item.Total !== ""
  );

  return {
    graphData: {
      labels: TestDays.map((d) => d.jsDate),
      data: TestDays.map((d) => d.MaxTest),
    },
    maxPullups: _.maxBy(TestDays, "MaxTest")?.MaxTest || 0,
    numTraining: TrainingDays.length,
    numTests: TestDays.length,
    dateOfLastTraining:
      data.length > 0 ? data[data.length - 1].jsDate.getTime() : null,
  };
}

module.exports = processPullups;
