class Game {
    constructor(parent) {
        const pixels = parent.offsetWidth;
        this.pixels = pixels;
        const size = parent.getAttribute("board-size") !== null ?
            parseInt(parent.getAttribute("board-size")) : 15;
        this.size = size;

        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.classList.add("svg-game");
        this.svg.setAttributeNS(null, "viewBox", "0 0 " + pixels + " " + pixels);
        this.svg.setAttributeNS(null, "width", pixels);
        this.svg.setAttributeNS(null, "height", pixels);

        // Draw grid
        this.gridPx = pixels / (size + 1);
        for (let i = 1; i <= size; i++) {
            const vertical = document.createElementNS("http://www.w3.org/2000/svg", "line");
            vertical.setAttribute("x1", this.gridPx * i);
            vertical.setAttribute("y1", this.gridPx);
            vertical.setAttribute("x2", this.gridPx * i);
            vertical.setAttribute("y2", this.gridPx * size);
            vertical.setAttribute("stroke", "black");
            this.svg.appendChild(vertical);
            
            const horizontal = document.createElementNS("http://www.w3.org/2000/svg", "line");
            horizontal.setAttribute("x1", this.gridPx);
            horizontal.setAttribute("y1", this.gridPx * i);
            horizontal.setAttribute("x2", this.gridPx * size);
            horizontal.setAttribute("y2", this.gridPx * i);
            horizontal.setAttribute("stroke", "black");
            this.svg.appendChild(horizontal);
        }

        // Draw the position
        const piecesAt = new Set();
        if (parent.hasAttribute("position")) {
            /*
            Format for position string is comma separated moves played, like
            5,60,123,0,224,...,42
            */
            const moves = parent.getAttribute("position").split(",").map(e => parseInt(e));
            this.currentMove = moves.length;
            this.pieces = moves.map((move, index) => {
                piecesAt.add(move);
                const r = Math.floor(move / size);
                const c = move % size;
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", (c + 1) * this.gridPx);
                circle.setAttribute("cy", (r + 1) * this.gridPx);
                circle.setAttribute("r", this.gridPx / 2.1);
                // Black moves first
                if (index % 2) {
                    circle.setAttribute("fill", "#ebebeb");
                } else {
                    circle.setAttribute("fill", "#1d1d1d");
                }
                this.svg.appendChild(circle);

                if (index === moves.length - 1) {
                    this.marker = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    this.marker.setAttribute("x", (c + 1) * this.gridPx - this.gridPx / 6);
                    this.marker.setAttribute("y", (r + 1) * this.gridPx - this.gridPx / 6);
                    this.marker.setAttribute("width", this.gridPx / 3);
                    this.marker.setAttribute("height", this.gridPx / 3);
                    this.marker.setAttribute("fill", "red");
                    this.svg.appendChild(this.marker);
                }
                return circle;
            });
        }

        if (parent.hasAttribute("movable")) {
            const prompt = document.createElementNS("http://www.w3.org/2000/svg", "text");
            prompt.setAttribute("x", 2);
            prompt.setAttribute("y", pixels - 2);
            prompt.textContent = "You can click me!"
            this.svg.appendChild(prompt);
            this.svg.onclick = (e) => this.onclick(e);
            this.svg.onmousedown = (e) => e.preventDefault();
        }

        if (parent.hasAttribute("heatmap")) {
            const values = parent.getAttribute("heatmap").split(",").map(e => parseFloat(e));
            const max = Math.max(...values);
            let idx = 0;
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (parent.hasAttribute("skip-existing") && piecesAt.has(r * size + c)) continue;
                    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    circle.setAttribute("cx", (c + 1) * this.gridPx);
                    circle.setAttribute("cy", (r + 1) * this.gridPx);
                    circle.setAttribute("r", this.gridPx / 2.1);
                    circle.setAttribute("fill", "#0080ff");
                    circle.setAttribute("opacity", values[idx++] / max);
                    this.svg.appendChild(circle);
                }
            }
        }

        if (parent.hasAttribute("ring")) {
            parent.getAttribute("ring").split(",")
                .map(e => parseInt(e))
                .forEach(e => {
                    const r = Math.floor(e / size);
                    const c = e % size;
                    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    circle.setAttribute("cx", (c + 1) * this.gridPx);
                    circle.setAttribute("cy", (r + 1) * this.gridPx);
                    circle.setAttribute("r", this.gridPx / 2.1);
                    circle.setAttribute("fill", "none");
                    circle.setAttribute("stroke", "#00ff00");
                    this.svg.appendChild(circle);
                });
        }

        parent.appendChild(this.svg);
    }

    onclick(e) {
        if (e.offsetX < this.pixels / 2) {
            this.setCurrentMove(this.currentMove - 1);
        } else {
            this.setCurrentMove(this.currentMove + 1);
        }
        e.preventDefault();
    }

    setCurrentMove(i) {
        i = Math.min(this.pieces.length, Math.max(0, i));
        this.currentMove = i;
        this.pieces.forEach((circle, index) => {
            if (index < i) {
                circle.setAttribute("opacity", 1);
            } else {
                circle.setAttribute("opacity", 0);
            }
            if (index == i - 1) {
                this.marker.setAttribute("x", parseFloat(circle.getAttribute("cx")) - this.gridPx / 6);
                this.marker.setAttribute("y", parseFloat(circle.getAttribute("cy")) - this.gridPx / 6);
            }
        });
        this.marker.setAttribute("opacity", i === 0 ? 0 : 1);
    }
}

const Init = () => {
    const games = document.getElementsByClassName("game");
    for (let d of games) {
        new Game(d);
    }
}

Init();
