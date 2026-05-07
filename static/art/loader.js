// Yes, this is vibed
async function loadJsonFromZip(url) {
    // Download ZIP
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to download ZIP: ${response.status}`);
    }

    const zipBuffer = await response.arrayBuffer();

    // Open ZIP
    const zip = await JSZip.loadAsync(zipBuffer);

    // Find first .json file
    const jsonFile = Object.values(zip.files).find(
        (file) => !file.dir && file.name.endsWith(".json")
    );

    if (!jsonFile) {
        throw new Error("No JSON file found in ZIP");
    }

    // Read file contents
    const jsonText = await jsonFile.async("text");

    // Parse and return JSON object
    return JSON.parse(jsonText);
}

async function showFlowPlot() {
    document.getElementById("flow-plot-loading-text").innerText = "Loading plot, this may take a moment...";

    window.PLOTLYENV = window.PLOTLYENV || {};
    let data = await loadJsonFromZip("/static/art/flow.json.zip");
    Plotly.newPlot("flow-plot", data.data, data.layout);

    document.getElementById("flow-plot-loading-text").innerText = "";
}

async function showRnadPlot() {
    document.getElementById("rnad-plot-loading-text").innerText = "Loading plot, this may take a moment...";

    window.PLOTLYENV = window.PLOTLYENV || {};
    let data = await loadJsonFromZip("/static/art/rnad.json.zip");
    Plotly.newPlot("rnad-plot", data.data, data.layout);

    document.getElementById("rnad-plot-loading-text").innerText = "";
}

async function show() {
    showFlowPlot();
    showRnadPlot();
}
