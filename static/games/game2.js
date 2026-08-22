(() => {
    "use strict";

    const STARTING_BALANCE = 100;
    const BANKRUPTCY_THRESHOLD = 0.005;
    const STEPS_PER_ROUND = 10;
    const LOG_RETURN_VARIANCE = 0.03;
    const LOG_RETURN_MEAN = 0.01 - LOG_RETURN_VARIANCE / 2;
    const STOCK_NAMES = [
        "Alto", "Beryl", "Cinder", "Delta", "Elm", "Fathom",
        "Grove", "Harbor", "Iris", "Juniper", "Kite", "Lumen",
    ];
    const COLORS = [
        "#1769aa", "#b34700", "#287d3c", "#7b3f98", "#8a4b08", "#007c91",
        "#a32955", "#4d6b1f", "#5b4b8a", "#9c6415", "#166534", "#9f1239",
    ];

    function money(dollars) {
        return `$${dollars.toFixed(2)}`;
    }

    // Box-Muller produces a standard normal variate from two uniform variates.
    function normalRandom() {
        let first = 0;
        let second = 0;
        while (first === 0) first = Math.random();
        while (second === 0) second = Math.random();
        return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
    }

    function createGame(parent) {
        let balance = STARTING_BALANCE;
        let round = 0;
        let stocks = [];
        let balanceHistory = [STARTING_BALANCE];
        let averagePriceHistory = [];

        parent.innerHTML = `
            <div class="game2-panel" style="position: relative; max-width: 52rem; padding: 1rem; border: 1px solid #ccc; border-radius: 0.4rem;">
                <button type="button" data-reset style="position: absolute; top: 1rem; right: 1rem;">Reset</button>
                <p style="margin-top: 0; padding-right: 4rem;"><strong>Balance: <span data-balance></span></strong></p>
                <p data-instructions>Choose a stock to put all your money into for the next 10 time steps.</p>
                <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; margin-bottom: 0.75rem;">
                    <div><strong>Balance history</strong><canvas data-balance-chart width="360" height="120" aria-label="Chart showing player balance history" style="display: block; width: 100%; height: 120px;"></canvas></div>
                    <div><strong>Average stock price</strong><canvas data-average-chart width="360" height="120" aria-label="Chart showing average stock price history" style="display: block; width: 100%; height: 120px;"></canvas></div>
                </div>
                <div data-stocks style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.6rem;"></div>
                <p aria-live="polite" data-summary style="min-height: 1.5em; margin-bottom: 0;"></p>
            </div>`;

        const balanceDisplay = parent.querySelector("[data-balance]");
        const balanceChart = parent.querySelector("[data-balance-chart]");
        const averageChart = parent.querySelector("[data-average-chart]");
        const stockContainer = parent.querySelector("[data-stocks]");
        const instructions = parent.querySelector("[data-instructions]");
        const summary = parent.querySelector("[data-summary]");
        const resetButton = parent.querySelector("[data-reset]");

        function makeStocks() {
            stocks = STOCK_NAMES.map((name, index) => ({
                name,
                color: COLORS[index],
                prices: [100],
                lastReturn: 1,
            }));
            averagePriceHistory = [100];
            rollStocks();
        }

        function renderStocks() {
            stockContainer.innerHTML = stocks.map((stock, index) => `
                <article style="min-width: 0; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.3rem;">
                    <h3 style="margin: 0 0 0.35rem; font-size: 1rem;">${stock.name}</h3>
                    <canvas data-chart="${index}" width="220" height="100" aria-label="${stock.name} price history" style="display: block; width: 100%; height: 100px; margin-bottom: 0.35rem;"></canvas>
                    <p style="margin: 0 0 0.35rem;">Price: <strong>${stock.prices[stock.prices.length - 1].toFixed(2)}</strong></p>
                    <button type="button" data-stock="${index}">All in!</button>
                </article>`).join("");

            stocks.forEach((stock, index) => drawChart(stock, stockContainer.querySelector(`[data-chart="${index}"]`)));
            drawHistoryChart(balanceChart, balanceHistory, "#1769aa");
            drawHistoryChart(averageChart, averagePriceHistory, "#555");
        }

        function drawHistoryChart(chart, values, color) {
            const context = chart.getContext("2d");
            if (!context) return;
            const width = chart.clientWidth || 360;
            const height = 120;
            const scale = window.devicePixelRatio || 1;
            chart.width = width * scale;
            chart.height = height * scale;
            context.setTransform(scale, 0, 0, scale, 0, 0);
            context.clearRect(0, 0, width, height);

            const minimum = Math.min(...values);
            const maximum = Math.max(...values);
            const range = Math.max(maximum - minimum, 0.01);
            const padding = 8;
            const x = index => padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
            const y = value => padding + (maximum - value) / range * (height - padding * 2);

            context.strokeStyle = color;
            context.lineWidth = 2;
            context.beginPath();
            values.forEach((value, index) => {
                if (index === 0) context.moveTo(x(index), y(value));
                else context.lineTo(x(index), y(value));
            });
            context.stroke();
        }

        function drawChart(stock, chart) {
            const context = chart.getContext("2d");
            if (!context) return;
            const width = chart.clientWidth || 220;
            const height = 100;
            const scale = window.devicePixelRatio || 1;
            chart.width = width * scale;
            chart.height = height * scale;
            context.setTransform(scale, 0, 0, scale, 0, 0);
            context.clearRect(0, 0, width, height);

            const minimum = Math.min(...stock.prices);
            const maximum = Math.max(...stock.prices);
            const range = Math.max(maximum - minimum, 0.01);
            const padding = 8;
            const x = index => padding + (index / Math.max(stock.prices.length - 1, 1)) * (width - padding * 2);
            const y = value => padding + (maximum - value) / range * (height - padding * 2);

            context.strokeStyle = stock.color;
            context.lineWidth = 2;
            context.beginPath();
            stock.prices.forEach((price, index) => {
                if (index === 0) context.moveTo(x(index), y(price));
                else context.lineTo(x(index), y(price));
            });
            context.stroke();
        }

        function updateBalance() {
            balanceDisplay.textContent = money(balance);
        }

        function rollStocks() {
            const startingLength = stocks[0].prices.length;
            stocks.forEach(stock => {
                const startingPrice = stock.prices[stock.prices.length - 1];
                let price = startingPrice;
                for (let step = 0; step < STEPS_PER_ROUND; step += 1) {
                    const logReturn = LOG_RETURN_MEAN + Math.sqrt(LOG_RETURN_VARIANCE) * normalRandom();
                    price *= Math.exp(logReturn);
                    stock.prices.push(price);
                }
                stock.lastReturn = price / startingPrice;
            });
            for (let index = startingLength; index < stocks[0].prices.length; index += 1) {
                const total = stocks.reduce((sum, stock) => sum + stock.prices[index], 0);
                averagePriceHistory.push(total / stocks.length);
            }
        }

        function finishGame() {
            stockContainer.querySelectorAll("button").forEach(button => {
                button.disabled = true;
            });
            instructions.textContent = "You are broke!";
        }

        function play(stockIndex) {
            if (balance < BANKRUPTCY_THRESHOLD) return;
            rollStocks();
            const chosenStock = stocks[stockIndex];
            const previousBalance = balance;
            balance *= chosenStock.lastReturn;
            round += 1;
            balanceHistory.push(balance);
            updateBalance();
            renderStocks();

            if (balance < BANKRUPTCY_THRESHOLD) {
                updateBalance();
                summary.textContent = `Round ${round}: ${chosenStock.name} went down. `;
                finishGame();
            } else {
                const change = balance - previousBalance;
                summary.textContent = `Round ${round}: ${chosenStock.name} changed your balance by ${change >= 0 ? "+" : "-"}${money(Math.abs(change))}.`;
            }
        }

        function reset() {
            balance = STARTING_BALANCE;
            round = 0;
            balanceHistory = [STARTING_BALANCE];
            makeStocks();
            updateBalance();
            renderStocks();
            instructions.textContent = "Choose a stock to put all your money into for the next 10 time steps.";
            summary.textContent = "New game started.";
        }

        resetButton.addEventListener("click", reset);
        stockContainer.addEventListener("click", event => {
            const button = event.target.closest("[data-stock]");
            if (button) play(Number(button.dataset.stock));
        });

        reset();
    }

    function mount() {
        document.querySelectorAll(".game2").forEach(createGame);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount);
    } else {
        mount();
    }
})();
