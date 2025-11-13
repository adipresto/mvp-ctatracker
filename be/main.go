package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
)

// RevenueEvent merepresentasikan satu event revenue dari tracker.js
type RevenueEvent struct {
	Channel   string  `json:"channel"`
	Amount    float64 `json:"amount"`
	Timestamp int64   `json:"timestamp"`
}

// in-memory storage untuk MVP
var (
	revenueEvents = []RevenueEvent{}
	mutex         sync.Mutex
)

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/track/revenue", handleRevenue)

	// optional: route GET /health untuk testing
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	server := &http.Server{
		Addr:              ":8180",
		Handler:           withCORS(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Println("🚀 Performance Tracker API running at http://localhost:8180")
	log.Fatal(server.ListenAndServe())
}

// handleRevenue menangani POST dan GET /api/track/revenue
func handleRevenue(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		var evt RevenueEvent
		if err := json.NewDecoder(r.Body).Decode(&evt); err != nil {
			http.Error(w, "invalid JSON", http.StatusBadRequest)
			return
		}

		mutex.Lock()
		revenueEvents = append(revenueEvents, evt)
		mutex.Unlock()

		log.Printf("📈 Revenue tracked: %+v\n", evt)
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})

	case http.MethodGet:
		mutex.Lock()
		defer mutex.Unlock()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(revenueEvents)

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// withCORS menambahkan CORS header agar bisa diakses dari frontend React
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
