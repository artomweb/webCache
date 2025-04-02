const { formatDate, timeago } = require("./helpers.js");

const _ = require("lodash");

const processSpotifyData = (dat) => {
  // Function to process the last two weeks of data
  const getLastTwoWeeks = (data) => {
    data.sort((a, b) => b.Date - a.Date);
    const recentData = data.slice(0, 14);
    recentData.reverse();
    const rawLabels = recentData.map((e) => {
      const date = new Date(e.Date);
      return date.toLocaleString("default", { month: "short", day: "numeric" });
    });
    const rawData = recentData.map((e) => e.Value);
    return { data: rawData, labels: rawLabels };
  };

  // Function to process all weeks data
  const getAllWeeks = (data) => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 3);
    data = data.filter((d) => new Date(d.Date) >= twoYearsAgo);

    const weekAvg = _.chain(data)
      .groupBy((d) => {
        const date = new Date(d.Date);
        return `${date.toLocaleString("default", {
          month: "short",
        })} ${date.getFullYear()}`;
      })
      .map((entries, week) => ({
        wofy: week,
        avg: _.sumBy(entries, (entry) => +entry.Value),
      }))
      .value();

    weekAvg.sort((a, b) => {
      const dateA = new Date(`${a.wofy}-01`);
      const dateB = new Date(`${b.wofy}-01`);
      return dateA - dateB;
    });

    const labels = weekAvg.map((w) => w.wofy);
    const dataValues = weekAvg.map((w) => w.avg);
    return { data: dataValues, labels };
  };

  // Function to process by day data
  const getByDay = (data) => {
    let totalAvgs = _.chain(data)
      .map((d) => {
        const date = new Date(d.Date);
        const options = { weekday: "short" };
        const day = date.toLocaleDateString("en-US", options);
        return { ...d, dofw: day };
      })
      .groupBy("dofw")
      .map((entries, day) => ({
        dofw: day,
        avg: Math.round(_.meanBy(entries, (entry) => entry.Value)),
      }))
      .value();

    const getIsoWeekday = (day) => {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return days.indexOf(day) + 1;
    };

    totalAvgs = _.sortBy(totalAvgs, (o) => getIsoWeekday(o.dofw));

    const labels = totalAvgs.map((val) => val.dofw);
    const dataOut = totalAvgs.map((val) => val.avg);
    return { data: dataOut, labels };
  };

  dat = dat.map((elem) => {
    return {
      Date: new Date(elem.Date),
      Value: +elem.Value,
    };
  });

  dat = dat.sort((a, b) => b.Date.getTime() - a.Date.getTime());

  // Process all the data
  const lastTwoWeeks = getLastTwoWeeks(dat);
  const allWeeks = getAllWeeks(dat);
  const byDay = getByDay(dat);

  const dateOfLastTest = formatDate(dat[0].Date);

  const dateOfLastTestMessage =
    dateOfLastTest + " (" + timeago(dat[0].Date) + ")";

  return {
    lastTwoWeeks,
    allWeeks,
    byDay,
    dateOfLastTestMessage,
    dateOfLastTest: dat[0].Date.getTime(),
  };
};

module.exports = processSpotifyData;
