package ai

var officialPiApps = map[string]bool{
	"pi.browser":      true,
	"pi.wallet":       true,
	"pi.miner":        true,
	"pi.apps.market":  true,
	"pi.developer":    true,
	// Auto-updated from Pi Foundation API
}

func loadPiAppsWhitelist() map[string]bool {
	// Fetch live from Pi Foundation API
	resp, _ := http.Get("https://api.pi.network/v1/apps/verified")
	
	var apps struct {
		Apps []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"apps"`
	}
	json.Unmarshal(resp.Body.Bytes(), &apps)
	
	whitelist := make(map[string]bool)
	for _, app := range apps.Apps {
		whitelist[app.ID] = true
	}
	return whitelist
}
