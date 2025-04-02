package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"google.golang.org/api/option"
	"google.golang.org/api/sheets/v4"
)

// DataStore structure to hold processed data
type DataStore struct {
	Data  any  `json:"data"`
	Error bool `json:"error"`
}

var (
	dataStore      = make(map[string]DataStore)
	lastUpdateTime *time.Time
)

// DataConfig represents configuration for each data source
type DataConfig struct {
	SpreadsheetID string
	Range         string
	ProcessFunc   func([]map[string]any) any
}

func processClimbing(data []map[string]any) any { return data }
func processCOD(data []map[string]any) any      { return data }
func processDobble(data []map[string]any) any   { return data }
func processDriving(data []map[string]any) any  { return data }
func processSpotify(data []map[string]any) any  { return data }
func processTyping(data []map[string]any) any   { return data }
func processDuo(data []map[string]any) any      { return data }
func processPushups(data []map[string]any) any  { return data }

// parseArrayToJson converts spreadsheet rows to JSON-like structure
func parseArrayToJson(data [][]any) []map[string]any {
	if len(data) == 0 {
		return nil
	}

	// Convert first row to headers
	headers := make([]string, len(data[0]))
	for i, val := range data[0] {
		if str, ok := val.(string); ok {
			headers[i] = str
		} else {
			headers[i] = fmt.Sprintf("Column%d", i)
		}
	}

	jsonData := make([]map[string]any, 0, len(data)-1)

	for _, row := range data[1:] {
		obj := make(map[string]any)
		for i, header := range headers {
			var value any
			if i < len(row) && row[i] != nil {
				value = row[i]
			} else {
				value = ""
			}

			// Handle boolean values
			if str, ok := value.(string); ok {
				switch strings.ToUpper(str) {
				case "TRUE":
					value = true
				case "FALSE":
					value = false
				}
			}

			// Convert to number if applicable
			if header != "SplitsMetric" {
				if str, ok := value.(string); ok && str != "" {
					if num, err := strconv.ParseFloat(str, 64); err == nil {
						value = num
					}
				}
			}

			// Parse SplitsMetric JSON
			if header == "SplitsMetric" {
				if str, ok := value.(string); ok && str != "" {
					var parsed any
					if err := json.Unmarshal([]byte(str), &parsed); err == nil {
						value = parsed
					}
				}
			}

			obj[header] = value

			// Handle StartDateEpoch
			if header == "StartDateEpoch" {
				if num, ok := value.(float64); ok {
					t := time.Unix(int64(num), 0)
					obj["jsDate"] = t.Format(time.RFC3339)
				}
			}
		}
		jsonData = append(jsonData, obj)
	}
	return jsonData
}

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize Google Sheets client with context
	ctx := context.Background()
	srv, err := sheets.NewService(ctx,
		option.WithCredentialsFile("./account.json"),
		option.WithScopes(sheets.SpreadsheetsReadonlyScope))
	if err != nil {
		log.Fatalf("Unable to initialize Sheets client: %v", err)
	}

	// Data configurations
	dataConfigs := map[string]DataConfig{
		"k5": {
			SpreadsheetID: os.Getenv("K5_SPREADSHEET_ID"),
			Range:         "Sheet1!A1:Z",
			ProcessFunc:   process5k,
		},
		"driving": {
			SpreadsheetID: os.Getenv("DRIVING_SPREADSHEET_ID"),
			Range:         "Sheet1!A1:Z",
			ProcessFunc:   processDriving,
		},
		"spotify": {
			SpreadsheetID: os.Getenv("SPOTIFY_SPREADSHEET_ID"),
			Range:         "Sheet1!A1:Z",
			ProcessFunc:   processSpotify,
		},
		"chess": {
			SpreadsheetID: os.Getenv("CHESS_SPREADSHEET_ID"),
			Range:         "Sheet1!A1:Z",
			ProcessFunc:   processChess,
		},
		"duolingo": {
			SpreadsheetID: os.Getenv("DUOLINGO_SPREADSHEET_ID"),
			Range:         "Sheet1!A1:Z",
			ProcessFunc:   processDuo,
		},
		"climbing": {
			SpreadsheetID: os.Getenv("CLIMBING_SPREADSHEET_ID"),
			Range:         "DetailedRoutes!A1:Z",
			ProcessFunc:   processClimbing,
		},
		"COD": {
			SpreadsheetID: os.Getenv("COD_SPREADSHEET_ID"),
			Range:         "AllGames!A1:Z",
			ProcessFunc:   processCOD,
		},
		"dobble": {
			SpreadsheetID: os.Getenv("DOBBLE_SPREADSHEET_ID"),
			Range:         "60!A1:Z",
			ProcessFunc:   processDobble,
		},
		"typing": {
			SpreadsheetID: os.Getenv("TYPING_SPREADSHEET_ID"),
			Range:         "Sheet1!A1:Z",
			ProcessFunc:   processTyping,
		},
		"pushups": {
			SpreadsheetID: os.Getenv("PUSHUPS_SPREADSHEET_ID"),
			Range:         "Sheet1!A1:Z",
			ProcessFunc:   processPushups,
		},
	}

	// HTTP handler
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		cacheKey := strings.TrimPrefix(r.URL.Path, "/")
		w.Header().Set("Content-Type", "application/json")

		switch cacheKey {
		case "all":
			json.NewEncoder(w).Encode(dataStore)
		case "updated":
			if lastUpdateTime != nil {
				fmt.Fprintf(w, `{"message": "Last updated at: %s"}`, lastUpdateTime)
			} else {
				fmt.Fprintf(w, `{"message": "Data has not been updated yet"}`)
			}
		default:
			if data, ok := dataStore[cacheKey]; ok {
				json.NewEncoder(w).Encode(data)
			} else {
				w.WriteHeader(http.StatusNotFound)
				json.NewEncoder(w).Encode(map[string]string{"error": "Data not found"})
			}
		}
	})

	// Fetch and store data function
	fetchDataAndStore := func() {
		for key, config := range dataConfigs {
			resp, err := srv.Spreadsheets.Values.Get(config.SpreadsheetID, config.Range).Do()
			if err != nil {
				log.Printf("Error fetching data for %s: %v", key, err)
				dataStore[key] = DataStore{Data: nil, Error: true}
				continue
			}

			if len(resp.Values) == 0 {
				log.Printf("No data found for %s", key)
				dataStore[key] = DataStore{Data: nil, Error: true}
				continue
			}

			jsonData := parseArrayToJson(resp.Values)
			processedData := config.ProcessFunc(jsonData)
			dataStore[key] = DataStore{Data: processedData, Error: false}
			log.Printf("Data for %s updated successfully", key)
		}

		now := time.Now()
		lastUpdateTime = &now
		log.Printf("Data updated at %s", now)
	}

	// Handle test mode
	if len(os.Args) > 2 && os.Args[1] == "--test" {
		testKey := os.Args[2]
		log.Printf("TESTING %s", testKey)
		config, exists := dataConfigs[testKey]
		if !exists {
			log.Printf("No config found for key: %s", testKey)
			log.Printf("Available keys: %v", strings.Join(getKeys(dataConfigs), ", "))
			os.Exit(1)
		}

		resp, err := srv.Spreadsheets.Values.Get(config.SpreadsheetID, config.Range).Do()
		if err != nil {
			log.Printf("Error testing %s: %v", testKey, err)
			os.Exit(1)
		}

		jsonData := parseArrayToJson(resp.Values)
		result := config.ProcessFunc(jsonData)
		log.Printf("%s Processing Result:", testKey)
		resultJSON, _ := json.MarshalIndent(result, "", "  ")
		fmt.Println(string(resultJSON))
		log.Println("Test complete")
		os.Exit(0)
	}

	// Start data fetching
	fetchDataAndStore()
	go func() {
		for range time.Tick(10 * time.Hour) {
			fetchDataAndStore()
		}
	}()

	// Start server
	log.Println("App Listening on port 2036")
	log.Fatal(http.ListenAndServe(":2036", nil))
}

// Helper function to get map keys
func getKeys(m map[string]DataConfig) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
