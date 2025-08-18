const _ = require("lodash");

function process5k(data) {
  // Process dates and ensure numeric values
  const processedRuns = data.map((run) => {
    run.jsDate = new Date(run.StartDateEpoch * 1000); // Convert epoch to JS Date
    run.BestEffort = Number(run.BestEffort);
    run.Distance = Number(run.Distance);
    return run;
  });

  // Sort runs by date (earliest to latest)
  processedRuns.sort((a, b) => a.jsDate - b.jsDate);

  // Calculate splits data across all runs
  const getSplitsInfo = (allSplits) => {
    if (!allSplits || allSplits.length === 0)
      return { averageSplit: null, fastestSplit: null };

    // Flatten all splits into a single array and filter valid ones
    const validSplits = allSplits
      .flat()
      .filter(
        (s) => s.moving_time > 0 && s.distance >= 900 && s.distance <= 1100
      );
    const splitTimes = validSplits.map((s) => s.moving_time);

    return {
      averageSplit: splitTimes.length ? _.mean(splitTimes) : null,
      fastestSplit: splitTimes.length ? _.min(splitTimes) : null,
    };
  };

  // Process splits from all runs
  const allSplits = processedRuns.map((run) => {
    try {
      return run.SplitsMetric ? run.SplitsMetric : [];
    } catch (e) {
      console.error(
        `Error parsing SplitsMetric for run at ${run.jsDate}:`,
        e.message
      );
      return [];
    }
  });
  const splitsInfo = getSplitsInfo(allSplits);

  return {
    graphData: {
      labels: processedRuns.map((r) => r.jsDate),
      data: processedRuns.map((r) => r.BestEffort),
    },
    numberOfRuns: processedRuns.length,
    fastestRun: _.minBy(processedRuns, "BestEffort")?.BestEffort,
    averageSplit: splitsInfo.averageSplit,
    fastestSplit: splitsInfo.fastestSplit,
    lastRun: processedRuns[processedRuns.length - 1]?.jsDate.getTime(),
  };
}

module.exports = process5k;
