package main

import (
	"sort"
	"time"
)

type GraphData struct {
	Labels []time.Time `json:"labels"`
	Data   []float64   `json:"data"`
}

type Process5kResult struct {
	GraphData    GraphData `json:"graphData"`
	NumberOfRuns int       `json:"numberOfRuns"`
	FastestRun   float64   `json:"fastestRun"`
	AverageSplit *float64  `json:"averageSplit"`
	FastestSplit *float64  `json:"fastestSplit"`
	LastRun      int64     `json:"lastRun"`
}

func process5k(data []map[string]any) any {
	// Process dates and ensure numeric values
	processedRuns := make([]map[string]any, len(data))
	for i, run := range data {
		processedRuns[i] = make(map[string]any)
		for k, v := range run {
			processedRuns[i][k] = v
		}

		// Convert StartDateEpoch to time.Time
		if epoch, ok := run["StartDateEpoch"].(float64); ok {
			processedRuns[i]["jsDate"] = time.Unix(int64(epoch), 0)
		}

		// Ensure numeric values
		if mt, ok := run["MovingTime"].(float64); ok {
			processedRuns[i]["MovingTime"] = mt
		}
		if dist, ok := run["Distance"].(float64); ok {
			processedRuns[i]["Distance"] = dist
		}
	}

	// Sort runs by date
	sort.Slice(processedRuns, func(i, j int) bool {
		timeI := processedRuns[i]["jsDate"].(time.Time)
		timeJ := processedRuns[j]["jsDate"].(time.Time)
		return timeI.Before(timeJ)
	})

	// Calculate splits info
	getSplitsInfo := func(allSplits [][]any) (float64, float64) {
		if len(allSplits) == 0 {
			return 0, 0
		}

		var validSplits []float64
		for _, splits := range allSplits {
			for _, split := range splits {
				if splitMap, ok := split.(map[string]any); ok {
					movingTime, mtOk := splitMap["moving_time"].(float64)
					distance, distOk := splitMap["distance"].(float64)
					if mtOk && distOk && movingTime > 0 && distance >= 900 && distance <= 1100 {
						validSplits = append(validSplits, movingTime)
					}
				}
			}
		}

		if len(validSplits) == 0 {
			return 0, 0
		}

		// Calculate average
		var sum float64
		for _, t := range validSplits {
			sum += t
		}
		average := sum / float64(len(validSplits))

		// Find fastest (minimum)
		fastest := validSplits[0]
		for _, t := range validSplits[1:] {
			if t < fastest {
				fastest = t
			}
		}

		return average, fastest
	}

	// Process splits from all runs
	allSplits := make([][]any, len(processedRuns))
	for i, run := range processedRuns {
		if splits, ok := run["SplitsMetric"].([]any); ok {
			allSplits[i] = splits
		} else {
			allSplits[i] = []any{}
		}
	}
	avgSplit, fastSplit := getSplitsInfo(allSplits)

	// Prepare result
	result := Process5kResult{
		GraphData: GraphData{
			Labels: make([]time.Time, len(processedRuns)),
			Data:   make([]float64, len(processedRuns)),
		},
		NumberOfRuns: len(processedRuns),
	}

	// Fill graph data and find fastest run
	fastestRun := float64(0)
	for i, run := range processedRuns {
		result.GraphData.Labels[i] = run["jsDate"].(time.Time)
		mt := run["MovingTime"].(float64)
		result.GraphData.Data[i] = mt
		if i == 0 || mt < fastestRun {
			fastestRun = mt
		}
	}
	result.FastestRun = fastestRun

	// Set splits info (using pointers to allow null values)
	if avgSplit > 0 {
		result.AverageSplit = &avgSplit
	}
	if fastSplit > 0 {
		result.FastestSplit = &fastSplit
	}

	// Set last run
	if len(processedRuns) > 0 {
		result.LastRun = processedRuns[len(processedRuns)-1]["jsDate"].(time.Time).Unix() * 1000
	}

	return result
}
