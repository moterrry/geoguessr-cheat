//              _ __  __          __                             __                __                           
//   ____ _(_) /_/ /_  __  __/ /_   _________  ____ ___    _/_/___ ___  ____  / /____  _________________  __
//  / __ `/ / __/ __ \/ / / / __ \ / ___/ __ \/ __ `__ \ _/_// __ `__ \/ __ \/ __/ _ \/ ___/ ___/ ___/ / / /
// / /_/ / / /_/ / / / /_/ / /_/ // /__/ /_/ / / / / / //_/ / / / / / / /_/ / /_/  __/ /  / /  / /  / /_/ / 
// \__, /_/\__/_/ /_/\__,_/_.___(_)___/\____/_/ /_/ /_/_/  /_/ /_/ /_/\____/\__/\___/_/  /_/  /_/   \__, /  
// /____/                                                                                          /____/   

// This is a Moterrry production

(function () {
    let lastCoords = { lat: 0, lng: 0 };

    function handleData(data, url) {
        if (!data) return;

        let roundCoords = null;

        // 1. Check for Duels API (v4)
        if (url.includes('/api/v4/duels/')) {
            const rounds = data.rounds;
            const roundIdx = data.currentRoundNumber - 1;
            if (rounds && rounds[roundIdx]) {
                roundCoords = { lat: rounds[roundIdx].lat, lng: rounds[roundIdx].lng };
            }
        }
        // 2. Check for Standard Games API (v3)
        else if (url.includes('/api/v3/games/')) {
            if (data.rounds && data.rounds.length > 0) {
                const currentRound = data.rounds[data.rounds.length - 1];
                if (currentRound && currentRound.lat && currentRound.lng) {
                    roundCoords = { lat: currentRound.lat, lng: currentRound.lng };
                }
            }
        }

        // 3. Fallback: Recursive search if no specific pattern matched
        if (!roundCoords) {
            const found = findCoordsRecursive(data);
            if (found) {
                // If we found coords recursively, only use them if they don't look like common defaults
                // US Center is approx 37, -95. We check for a broad box to avoid map-meta centers.
                const isUsCenter = (Math.abs(found.lat - 37) < 1 && Math.abs(found.lng + 95) < 1);
                if (!isUsCenter) {
                    roundCoords = found;
                }
            }
        }

        if (roundCoords) {
            // Only update if coordinates changed significantly to avoid looping on static meta
            if (Math.abs(roundCoords.lat - lastCoords.lat) > 0.0001 || Math.abs(roundCoords.lng - lastCoords.lng) > 0.0001) {
                lastCoords = roundCoords;
                dispatchCoords(roundCoords.lat, roundCoords.lng);
            }
        }
    }

    function findCoordsRecursive(obj) {
        if (!obj || typeof obj !== 'object') return null;
        if (typeof obj.lat === 'number' && typeof obj.lng === 'number') {
            return { lat: obj.lat, lng: obj.lng };
        }
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const result = findCoordsRecursive(obj[key]);
                if (result) return result;
            }
        }
        return null;
    }

    function dispatchCoords(lat, lng) {
        console.log(`Map Discovery Pro: Found Round Target ${lat}, ${lng}`);
        window.postMessage({
            type: 'GEOGUESSR_COORDINATES',
            lat,
            lng
        }, '*');
    }

    // --- Intercept Fetch ---
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch(...args);
        const url = args[0] instanceof Request ? args[0].url : args[0];

        if (url.includes('geoguessr.com/api/')) {
            const clone = response.clone();
            clone.json().then(data => handleData(data, url)).catch(() => { });
        }
        return response;
    };

    // --- Intercept XMLHttpRequest ---
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
        this.addEventListener('load', function () {
            if (this._url && this._url.includes('geoguessr.com/api/')) {
                try {
                    const data = JSON.parse(this.responseText);
                    handleData(data, this._url);
                } catch (e) { }
            }
        });
        return originalSend.apply(this, arguments);
    };
})();
