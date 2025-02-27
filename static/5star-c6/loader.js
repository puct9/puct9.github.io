// Copied straight out of ChatGPT lmao
async function loadDataFromZip(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch zip file: ${response.statusText}`);
        }
        const zipBlob = await response.blob();
        const zip = await JSZip.loadAsync(zipBlob);
        const dataFile = zip.file("data.bin");
        if (!dataFile) throw new Error("data.bin file not found");
        const arrayBuffer = await dataFile.async("arraybuffer");
        const doubleArray = new Float32Array(arrayBuffer);
        return doubleArray;
    } catch (error) {
        throw error;
    }
}

let prob;
async function downloadProbs() {
    prob = await loadDataFromZip("/static/5star-c6/data.bin.zip");
}

// Step 1: Reshape a Float32Array into a 10x10 2D array
function reshapeTo2D(array, rows, cols) {
    if (array.length !== rows * cols) {
        throw new Error("Array length does not match the specified dimensions.");
    }
    const reshaped = [];
    for (let i = 0; i < rows; i++) {
        reshaped.push(array.slice(i * cols, i * cols + cols));
    }
    return reshaped;
}

function displayHeatmap(data2d, rowIdxs) {
    const trace = {
        z: data2d,
        y: rowIdxs,
        type: "heatmap",
        colorscale: "Viridis",
        hovertemplate: 'Pity: %{x}<br>Pulls: %{y}<br>Prob: %{z}<extra></extra>'
    };

    const layout = {
        title: "Probability to get C6",
        xaxis: { title: "Pity" },
        yaxis: { title: "Pulls" },
        coloraxis: {
            colorbar: {
                title: "Prob"
            }
        }
    };

    Plotly.newPlot("heatmap-container", [trace], layout);
}

async function show(cons, guarantee, captrad) {
    if (prob === undefined) await downloadProbs();

    // Array shape [ cons=7 guarantee=2 captrad_pity=4 pulls=1170 pity=90 ]
    const blockSize = 1170 * 90;
    cons = cons == -1 ? 6 : cons;
    const block = cons * 2 * 4 + guarantee * 4 + captrad;
    const start = block * blockSize;
    const end = (block + 1) * blockSize;
    const all = reshapeTo2D(prob.slice(start, end), 1170, 90);
    const rows = all.map((row, idx) => row[89] > 0.005 && row[0] < 0.995 ? idx : undefined).filter(x => x !== undefined);
    const data = rows.map(idx => all[idx]);
    const rows_plus_1 = rows.map(x => x + 1);
    displayHeatmap(data, rows_plus_1);
}
