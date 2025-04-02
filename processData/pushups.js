const _ = require("lodash");
function processPushups(data) {
  data = data.map((d) => {
    const [day, month, year] = d.Date.split("/"); // Split the string into day, month, year
    d.jsDate = new Date(Date.UTC(year, month - 1, day));
    return d;
  });
  data = data.filter(
    (d) => d.Date && d.jsDate && !isNaN(new Date(d.jsDate).getTime())
  );

  const TrainingDays = data.filter(
    (item) => item.MaxTest === "" && item.Total !== ""
  );

  const TestDays = data.filter(
    (item) => item.MaxTest !== "" && item.Total !== ""
  );

  return {
    graphData: {
      labels: TestDays.map((d) => d.jsDate),
      data: TestDays.map((d) => d.MaxTest),
    },
    maxPushups: _.maxBy(TestDays, "MaxTest").MaxTest,
    numTraining: TrainingDays.length,
    numTests: TestDays.length,
    dateOfLastTraining: data[data.length - 1].jsDate.getTime(),
  };
}

module.exports = processPushups;
