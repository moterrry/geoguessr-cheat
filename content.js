//              _ __  __          __                             __                __                           
//   ____ _(_) /_/ /_  __  __/ /_   _________  ____ ___    _/_/___ ___  ____  / /____  _________________  __
//  / __ `/ / __/ __ \/ / / / __ \ / ___/ __ \/ __ `__ \ _/_// __ `__ \/ __ \/ __/ _ \/ ___/ ___/ ___/ / / /
// / /_/ / / /_/ / / / /_/ / /_/ // /__/ /_/ / / / / / //_/ / / / / / / /_/ / /_/  __/ /  / /  / /  / /_/ / 
// \__, /_/\__/_/ /_/\__,_/_.___(_)___/\____/_/ /_/ /_/_/  /_/ /_/ /_/\____/\__/\___/_/  /_/  /_/   \__, /  
// /____/                                                                                          /____/   

// This is a Moterrry production

// geoguessr script by github.com/moterrry

// inject into the main world
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
(document.head || document.documentElement).appendChild(script);
script.onload = () => script.remove();

let overlay = null;
let isVisible = localStorage.getItem('mapDiscoveryVisible') !== 'false';

function createOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'geoguessr-country-overlay';
    if (!isVisible) overlay.classList.add('hidden');

    overlay.innerHTML = `
        <div class="header">
            <span>Metadata</span>
            <span class="hotkey-hint">Alt+Y</span>
        </div>
        <div class="content">Searching...</div>
        <div class="attribution">
            Geoguessr script made by <a href="https://github.com/moterrry" target="_blank">moterrry</a>
        </div>
    `;
    document.body.appendChild(overlay);
}

function toggleOverlay() {
    isVisible = !isVisible;
    localStorage.setItem('mapDiscoveryVisible', isVisible);
    if (overlay) {
        if (isVisible) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}

// Hotkey listener: Alt + Y
document.addEventListener('keydown', (e) => {
    if (e.altKey && e.code === 'KeyY') {
        e.preventDefault();
        toggleOverlay();
    }
});

async function getCountry(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
        if (!response.ok) throw new Error('Geocoding service unavailable');
        const data = await response.json();
        return data.address.country || data.display_name || 'Unknown Zone';
    } catch (err) {
        return 'Connection error';
    }
}

window.addEventListener('message', async (event) => {
    if (event.source !== window || !event.data || event.data.type !== 'GEOGUESSR_COORDINATES') {
        return;
    }

    createOverlay();
    const { lat, lng } = event.data;
    const contentEl = overlay.querySelector('.content');

    contentEl.innerText = 'Analyzing...';
    overlay.classList.add('loading');

    const country = await getCountry(lat, lng);

    contentEl.innerHTML = `
        <div class="country-name">${country}</div>
        <div class="coords">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
    `;
    overlay.classList.remove('loading');
});

// initial create attempt
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    createOverlay();
} else {
    document.addEventListener('DOMContentLoaded', createOverlay);
}
