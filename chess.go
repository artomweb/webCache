package main

import (
	"math"
	"sort"
	"strconv"
	"time"
)

// ChessGameStatsByHour holds hourly game statistics
type ChessGameStatsByHour struct {
	LabelsByHour        []int     `json:"labelsByHour"`
	DataByHour          []float64 `json:"dataByHour"`
	AccuracyByHour      []float64 `json:"accuracyByHour"`
	PointRadiusArray    []int     `json:"pointRadiusArray"`
	AccPointRadiusArray []int     `json:"accpointRadiusArray"`
}

// ChessDataByDay holds daily rating data
type ChessDataByDay struct {
	Labels    []string `json:"labels"`
	GraphData []int    `json:"graphData"`
}

// ProcessChessResult is the structured result for chess data
type ProcessChessResult struct {
	HighestRating        int                  `json:"highestRating"`
	NumGames             int                  `json:"numGames"`
	TimeMessage          string               `json:"timeMessage"`
	ChangeInScorePerHour string               `json:"changeInScorePerHour"`
	TimeSinceLastGame    string               `json:"timeSinceLastGame"`
	GameStatsByHour      ChessGameStatsByHour `json:"gameStatsByHour"`
	DataByDay            ChessDataByDay       `json:"dataByDay"`
	DateOfLastGame       int64                `json:"dateOfLastGame"`
}

func formatDate(t time.Time) string {
	return t.Format("02/01/2006")
}

func timeAgo(t time.Time) string {
	now := time.Now()
	duration := now.Sub(t)

	hours := int(duration.Hours())
	if hours < 24 {
		return strconv.Itoa(hours) + " hours ago"
	}

	days := hours / 24
	if days < 30 {
		return strconv.Itoa(days) + " days ago"
	}

	months := days / 30
	if months < 12 {
		return strconv.Itoa(months) + " months ago"
	}

	years := months / 12
	return strconv.Itoa(years) + " years ago"
}

// findLineByLeastSquares implements a simple linear regression
func findLineByLeastSquares(values []int) [2][2]float64 {
	n := float64(len(values))
	if n == 0 {
		return [2][2]float64{{0, 0}, {0, 0}}
	}

	var sumX, sumY, sumXY, sumXX float64
	for i, y := range values {
		x := float64(i)
		sumX += x
		sumY += float64(y)
		sumXY += x * float64(y)
		sumXX += x * x
	}

	slope := (n*sumXY - sumX*sumY) / (n*sumXX - sumX*sumX)
	intercept := (sumY - slope*sumX) / n

	return [2][2]float64{
		{0, intercept},
		{float64(len(values) - 1), intercept + slope*float64(len(values)-1)},
	}
}

func processChess(data []map[string]any) any {

	// Process raw data into a new slice with converted types
	processedGames := make([]map[string]any, len(data))
	for i, game := range data {
		processedGames[i] = make(map[string]any)
		for k, v := range game {
			processedGames[i][k] = v
		}

		// Convert startTime to time.Time (assuming it's in seconds)
		if startTimeStr, ok := game["startTime"]; ok && startTimeStr != "" {
			if startTime, err := strconv.ParseInt(startTimeStr, 10, 64); err == nil {
				processedGames[i]["startTime"] = time.UnixMilli(startTime * 1000)
			}
		}

		// Convert numeric values
		if gameLengthStr, ok := game["gameLength"]; ok && gameLengthStr != "" {
			if gameLength, err := strconv.ParseFloat(gameLengthStr, 64); err == nil {
				processedGames[i]["gameLength"] = gameLength
			}
		}
		if myRatingStr, ok := game["myRating"]; ok && myRatingStr != "" {
			if myRating, err := strconv.Atoi(myRatingStr); err == nil {
				processedGames[i]["myRating"] = myRating
			}
		}
		if myAccuracyStr, ok := game["myAccuracy"]; ok && myAccuracyStr != "" {
			if myAccuracy, err := strconv.ParseFloat(myAccuracyStr, 64); err == nil {
				processedGames[i]["myAccuracy"] = myAccuracy
			}
		}
	}

	// Sort by start time
	sort.Slice(processedGames, func(i, j int) bool {
		timeI, okI := processedGames[i]["startTime"].(time.Time)
		timeJ, okJ := processedGames[j]["startTime"].(time.Time)
		if !okI || !okJ {
			return false // If conversion fails, maintain original order
		}
		return timeI.Before(timeJ)
	})

	// Calculate highest rating per day
	type DailyHigh struct {
		StartTime time.Time
		Day       string
		Highest   int
	}
	dailyHighs := make([]DailyHigh, 0)
	byDay := make(map[string][]map[string]any)
	for _, game := range processedGames {
		startTime, ok := game["startTime"].(time.Time)
		if !ok {
			continue
		}
		day := startTime.Format("02/01/06")
		byDay[day] = append(byDay[day], game)
	}
	for day, entries := range byDay {
		if len(entries) == 0 {
			continue
		}
		highest := entries[0]
		for _, entry := range entries[1:] {
			if entryRating, ok := entry["myRating"].(int); ok {
				if highestRating, ok := highest["myRating"].(int); ok && entryRating > highestRating {
					highest = entry
				}
			}
		}
		startTime, ok := highest["startTime"].(time.Time)
		if !ok {
			continue
		}
		rating, ok := highest["myRating"].(int)
		if !ok {
			continue
		}
		dailyHighs = append(dailyHighs, DailyHigh{
			StartTime: startTime,
			Day:       day,
			Highest:   rating,
		})
	}
	sort.Slice(dailyHighs, func(i, j int) bool {
		return dailyHighs[i].StartTime.Before(dailyHighs[j].StartTime)
	})

	// Group data by hour for win % and accuracy
	getHourlyStats := func(games []map[string]any) ([]float64, []float64) {
		byHour := make(map[int][]map[string]any)
		for _, game := range games {
			startTime, ok := game["startTime"].(time.Time)
			if !ok {
				continue
			}
			hour := startTime.Hour()
			byHour[hour] = append(byHour[hour], game)
		}

		hourlyWins := make([]float64, 24)
		hourlyAccuracy := make([]float64, 24)
		for hour := 0; hour < 24; hour++ {
			entries := byHour[hour]
			if len(entries) == 0 {
				continue
			}
			wins := 0
			var accuracySum float64
			for _, entry := range entries {
				if result, ok := entry["myResult"].(string); ok && result == "win" {
					wins++
				}
				if accuracy, ok := entry["myAccuracy"].(float64); ok {
					accuracySum += accuracy
				}
			}
			hourlyWins[hour] = math.Round((float64(wins)/float64(len(entries))*100)*10) / 10
			hourlyAccuracy[hour] = math.Round((accuracySum/float64(len(entries)))*10) / 10
		}
		return hourlyWins, hourlyAccuracy
	}

	hourlyWins, hourlyAccuracy := getHourlyStats(processedGames)

	// Prepare game stats by hour
	gameStats := ChessGameStatsByHour{
		LabelsByHour:        make([]int, 24),
		DataByHour:          make([]float64, 24),
		AccuracyByHour:      make([]float64, 24),
		PointRadiusArray:    make([]int, 24),
		AccPointRadiusArray: make([]int, 24),
	}
	for i := 0; i < 24; i++ {
		gameStats.LabelsByHour[i] = i
		gameStats.DataByHour[i] = hourlyWins[i]
		gameStats.AccuracyByHour[i] = hourlyAccuracy[i]
		gameStats.PointRadiusArray[i] = 0
		if hourlyWins[i] != 0 {
			gameStats.PointRadiusArray[i] = 3
		}
		gameStats.AccPointRadiusArray[i] = 0
		if hourlyAccuracy[i] != 0 {
			gameStats.AccPointRadiusArray[i] = 3
		}
	}

	// Calculate additional statistics
	highestRating := 0
	for _, game := range processedGames {
		if rating, ok := game["myRating"].(int); ok && rating > highestRating {
			highestRating = rating
		}
	}
	numGames := len(processedGames)

	ratings := make([]int, len(processedGames))
	for i, game := range processedGames {
		if rating, ok := game["myRating"].(int); ok {
			ratings[i] = rating
		}
	}
	trend := findLineByLeastSquares(ratings)
	ratingChange := trend[1][1] - trend[0][1]

	var totalGameLength float64
	for _, game := range processedGames {
		if length, ok := game["gameLength"].(float64); ok {
			totalGameLength += length
		}
	}

	changePerHour := ratingChange * (3600 / totalGameLength)
	porNChange := "+"
	if changePerHour < 0 {
		porNChange = "-"
	}
	changeInScorePerHour := porNChange + strconv.FormatFloat(math.Abs(changePerHour), 'f', 2, 64)
	timeMessage := strconv.Itoa(int(math.Round(totalGameLength/(60*60)))) + " hours"

	lastGameTime, _ := processedGames[len(processedGames)-1]["startTime"].(time.Time)
	timeSinceLastGame := formatDate(lastGameTime) + " (" + timeAgo(lastGameTime) + ")"

	// Build result
	result := ProcessChessResult{
		HighestRating:        highestRating,
		NumGames:             numGames,
		TimeMessage:          timeMessage,
		ChangeInScorePerHour: changeInScorePerHour,
		TimeSinceLastGame:    timeSinceLastGame,
		GameStatsByHour:      gameStats,
		DataByDay: ChessDataByDay{
			Labels:    make([]string, len(dailyHighs)),
			GraphData: make([]int, len(dailyHighs)),
		},
		DateOfLastGame: lastGameTime.UnixMilli(),
	}

	for i, daily := range dailyHighs {
		result.DataByDay.Labels[i] = daily.Day
		result.DataByDay.GraphData[i] = daily.Highest
	}

	return result
}
