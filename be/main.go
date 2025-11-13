package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"sync"
	"time"
)

// RevenueEvent merepresentasikan payload tracker.js
type RevenueEvent struct {
	Channel       string             `json:"channel"`
	CtaID         string             `json:"cta_id"`
	TransactionID string             `json:"transaction_id"`
	Amount        float64            `json:"amount"`
	Page          string             `json:"page"`
	Utm           map[string]*string `json:"utm"`
	Timestamp     int64              `json:"timestamp"`
}

// in-memory storage + cache
var (
	revenueEvents = []RevenueEvent{}
	cache         = []RevenueEvent{}
	mutex         sync.Mutex
	cacheTTL      = 2 * time.Second
	lastCacheTime time.Time
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/track/revenue", handleRevenue)
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

// handleRevenue menangani POST dan GET
func handleRevenue(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		handlePostRevenue(w, r)
	case http.MethodGet:
		handleGetRevenue(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// POST: terima event baru
func handlePostRevenue(w http.ResponseWriter, r *http.Request) {
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
}

// GET: ambil page data + totals
func handleGetRevenue(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()

	now := time.Now()
	if now.Sub(lastCacheTime) > cacheTTL {
		cache = make([]RevenueEvent, len(revenueEvents))
		copy(cache, revenueEvents)
		lastCacheTime = now
	}

	// query params
	page := 1
	pageSize := 10
	fmt.Sscanf(r.URL.Query().Get("page"), "%d", &page)
	fmt.Sscanf(r.URL.Query().Get("pageSize"), "%d", &pageSize)
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}

	utmCampaign := r.URL.Query().Get("utm_campaign")
	period := r.URL.Query().Get("period") // "7d", "30d", "all"
	nowUnix := time.Now().UnixMilli()

	// filter sesuai query
	var filtered []RevenueEvent
	for _, e := range cache {
		if utmCampaign != "" && utmCampaign != "all" {
			if e.Utm["utm_campaign"] == nil || *e.Utm["utm_campaign"] != utmCampaign {
				continue
			}
		}
		if period == "7d" && e.Timestamp < nowUnix-7*24*60*60*1000 {
			continue
		}
		if period == "30d" && e.Timestamp < nowUnix-30*24*60*60*1000 {
			continue
		}
		filtered = append(filtered, e)
	}

	// sort terbaru ke atas
	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].Timestamp > filtered[j].Timestamp
	})

	// total per channel (sum semua filtered, bukan page)
	totals := map[string]float64{}
	for _, e := range filtered {
		totals[e.Channel] += e.Amount
	}

	// pagination
	total := len(filtered)
	start := (page - 1) * pageSize
	end := start + pageSize
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}
	paged := filtered[start:end]

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":       paged,
		"totals":     totals,
		"total":      total,
		"page":       page,
		"pageSize":   pageSize,
		"totalPages": (total + pageSize - 1) / pageSize,
	})
}

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
