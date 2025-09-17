import react from "react";

const MapComponent = () => {
  <div></div>;
};

export default MapComponent;

/*

<div id="map"></div>
<div id="error-message"></div>

<script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>

<script>
    // Initialize the map
    const map = L.map('map').setView([55.7558, 37.6173], 10); // Moscow

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const geojsonPath = "http://localhost:5500/static/mapapp/moscow_districts.geojson";
    function styleFeature(feature) {
return {
    color: "#3388ff",
    weight: 1,
    fillOpacity: 0.3
};

}

    let selectedDistrictNames = new Set(); // Use Set for fast lookup

function onEachFeature(feature, layer) {
const districtName = feature.properties.district || feature.properties.DISTRICT || "Unknown";

layer.on('click', function () {
    if (selectedDistrictNames.has(districtName)) {
        // Deselect visually
        layer.setStyle({
            color: "#3388ff",
            weight: 1,
            fillOpacity: 0.3
        });

        selectedDistrictNames.delete(districtName);
        saveSelection(districtName, 'remove');
    } else {
        // Select visually
        layer.setStyle({
            color: 'red',
            weight: 2,
            fillColor: 'red',
            fillOpacity: 0.6
        });

        selectedDistrictNames.add(districtName);
        saveSelection(districtName, 'add');
    }
});

}

// Update the saveSelection function to send the 'action' parameter
function saveSelection(districtName, action) {
fetch('/toggle-district-selection/', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'X-CSRFToken': getCookie('csrftoken')
},
body: JSON.stringify({ district: districtName, action: action })
})
.then(response => {
if (!response.ok) throw new Error('Failed to toggle district selection');
return response.json();
})
.then(data => {
console.log(`District ${action}ed:`, districtName);
})
.catch(err => {
document.getElementById('error-message').textContent = 'Error toggling district: ' + err.message;
});
}

function loadSelectedDistricts() {
fetch('/get-selected-districts/')
.then(response => response.json())
.then(data => {
const selected = new Set(data.selectedDistricts);
selectedDistrictNames = selected; // Set global set
console.log("Selected districts:", Array.from(selectedDistrictNames));

        if (geojson) {
            geojson.eachLayer(layer => {
                const name = layer.feature.properties.district || layer.feature.properties.DISTRICT;
                if (selected.has(name)) {
                    layer.setStyle({
                        color: 'red',
                        weight: 2,
                        fillColor: 'red',
                        fillOpacity: 0.6
                    });
                }
            });
        }
    })
    .catch(err => {
        document.getElementById('error-message').textContent = 'Error loading selected districts: ' + err.message;
    });
    
}

    // Utility function to get CSRF token from cookie (for Django)
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    let geojson;

    fetch(geojsonPath)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load the GeoJSON file');
            }
            return response.json();
        })
        .then(geojsonData => {
            geojson = L.geoJSON(geojsonData, {
                onEachFeature: onEachFeature,
                style: {
                    color: "#3388ff",
                    weight: 1,
                    fillOpacity: 0.3
                }
            }).addTo(map);
            
            // Load selected districts from the server after loading the GeoJSON data
            loadSelectedDistricts();
        })
        .catch(err => {
            document.getElementById('error-message').textContent = 'Error loading GeoJSON data: ' + err.message;
        });
</script>

*/
