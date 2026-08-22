(() => {
    "use strict";

    const STARTING_CASH = 100;
    const STARTING_PRICE = 1000;
    const MAX_SHARES = 10;
    const TRADE_FEE_PER_SHARE = 0.1;
    const FILL_RATE = 0.2;

    function money(value) {
        return `$${value.toFixed(2)}`;
    }

    function signedMoney(value) {
        return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
    }

    // Box-Muller produces a standard normal variate from two uniform variates.
    function normalRandom(mean = 0, standardDeviation = 1) {
        let first = 0;
        let second = 0;
        while (first === 0) first = Math.random();
        while (second === 0) second = Math.random();
        return mean + standardDeviation * Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
    }

    function createGame(parent) {
        let cash = STARTING_CASH;
        let stockPrice = STARTING_PRICE;
        let position = 0;
        let round = 0;
        let hiddenMove = 0;
        let hint = 0;
        let priceHistory = [STARTING_PRICE];
        let balanceHistory = [STARTING_CASH];

        parent.innerHTML = `
            <div class="game4-panel" style="position: relative; max-width: 42rem; padding: 1rem; border: 1px solid #ccc; border-radius: 0.4rem;">
                <button type="button" data-reset style="position: absolute; top: 1rem; right: 1rem;">Reset</button>
                <p style="margin-top: 0; padding-right: 4rem;"><strong>Balance: <span data-balance></span></strong></p>
                <p>Stock price: <strong data-price></strong><br>Model preview move: <strong data-preview></strong></p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
                    <div><strong>Stock price history</strong><canvas data-price-chart width="340" height="180" aria-label="Chart showing stock price history" style="display: block; width: 100%; height: 180px;"></canvas></div>
                    <div><strong>Player balance history</strong><canvas data-balance-chart width="340" height="180" aria-label="Chart showing player balance history" style="display: block; width: 100%; height: 180px;"></canvas></div>
                </div>
                <p>The model's hint is noisy, but it is correlated with the next dollar move. Choose your target position for the next move. Positive shares are long; negative shares are short. Every traded share costs you $0.10.</p>
                <p style="margin-bottom: 0;">Current position: <strong data-position>0 shares</strong></p>
                <label>Target position: <strong data-shares>0 shares</strong><br>
                    <input data-slider type="range" min="-10" max="10" step="1" value="0" style="width: min(100%, 20rem);">
                </label>
                <p style="margin-bottom: 0.5rem;"><button type="button" data-trade>Take this position</button></p>
                <p aria-live="polite" data-summary style="min-height: 1.5em; margin-bottom: 0;"></p>
            </div>`;

        const balanceDisplay = parent.querySelector("[data-balance]");
        const priceDisplay = parent.querySelector("[data-price]");
        const previewDisplay = parent.querySelector("[data-preview]");
        const sharesDisplay = parent.querySelector("[data-shares]");
        const positionDisplay = parent.querySelector("[data-position]");
        const slider = parent.querySelector("[data-slider]");
        const priceChart = parent.querySelector("[data-price-chart]");
        const balanceChart = parent.querySelector("[data-balance-chart]");
        const tradeButton = parent.querySelector("[data-trade]");
        const resetButton = parent.querySelector("[data-reset]");
        const summary = parent.querySelector("[data-summary]");

        function balance() {
            return cash;
        }

        function drawChart(chart, values, color) {
            const context = chart.getContext("2d");
            if (!context) return;
            const width = chart.clientWidth || 340;
            const height = 180;
            const scale = window.devicePixelRatio || 1;
            chart.width = width * scale;
            chart.height = height * scale;
            context.setTransform(scale, 0, 0, scale, 0, 0);
            context.clearRect(0, 0, width, height);

            const minimum = Math.min(...values);
            const maximum = Math.max(...values);
            const range = Math.max(maximum - minimum, 1);
            context.font = "12px sans-serif";
            const labelWidth = Math.max(context.measureText(money(maximum)).width, context.measureText(money(minimum)).width);
            const padding = { top: 12, right: 12, bottom: 12, left: labelWidth + 12 };
            const plotWidth = width - padding.left - padding.right;
            const plotHeight = height - padding.top - padding.bottom;
            const x = index => padding.left + (index / Math.max(values.length - 1, 1)) * plotWidth;
            const y = value => padding.top + (maximum - value) / range * plotHeight;

            context.strokeStyle = "#d8d8d8";
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(padding.left, padding.top);
            context.lineTo(padding.left, padding.top + plotHeight);
            context.lineTo(padding.left + plotWidth, padding.top + plotHeight);
            context.stroke();
            context.fillStyle = "#555";
            context.textAlign = "right";
            context.fillText(money(maximum), padding.left - 6, padding.top + 4);
            context.fillText(money(minimum), padding.left - 6, padding.top + plotHeight);
            context.strokeStyle = color;
            context.lineWidth = 2;
            context.beginPath();
            values.forEach((value, index) => {
                if (index === 0) context.moveTo(x(index), y(value));
                else context.lineTo(x(index), y(value));
            });
            context.stroke();
        }

        function updateDisplay() {
            balanceDisplay.textContent = money(balance());
            priceDisplay.textContent = money(stockPrice);
            previewDisplay.textContent = signedMoney(hint);
            const shares = Number(slider.value);
            sharesDisplay.textContent = `${shares > 0 ? "+" : ""}${shares} ${Math.abs(shares) === 1 ? "share" : "shares"}`;
            positionDisplay.textContent = `${position > 0 ? "+" : ""}${position} ${Math.abs(position) === 1 ? "share" : "shares"}`;
            drawChart(priceChart, priceHistory, "#1769aa");
            drawChart(balanceChart, balanceHistory, "#b34700");
        }

        function generateNextMove() {
            hint = normalRandom(-0.01 * position, 0.5);
            hiddenMove = normalRandom(hint);
        }

        function finishGame() {
            slider.disabled = true;
            tradeButton.disabled = true;
            summary.textContent += " You are out of money. Press Reset to play again.";
        }

        function play() {
            if (cash <= 0) return;
            const requestedShares = Number(slider.value);
            const previousPrice = stockPrice;
            const previousBalance = balance();
            const requestedChange = requestedShares - position;
            const requestedDirection = Math.sign(requestedChange);
            stockPrice += hiddenMove;
            const isAgainst = requestedChange * hiddenMove < 0;
            let filledShares = requestedChange;
            if (!isAgainst) {
                filledShares = 0;
                for (let share = 0; share < Math.abs(requestedChange); share += 1) {
                    if (Math.random() < FILL_RATE) filledShares += requestedDirection;
                }
            }
            const tradeFee = Math.abs(filledShares) * TRADE_FEE_PER_SHARE;
            cash -= tradeFee;
            position += filledShares;
            cash += position * hiddenMove;
            round += 1;
            priceHistory.push(stockPrice);
            balanceHistory.push(balance());
            generateNextMove();
            slider.value = String(position);
            updateDisplay();
            summary.textContent = `Round ${round}: requested to ${requestedChange >= 0 ? "buy" : "sell"} ${Math.abs(requestedChange)} ${Math.abs(requestedChange) === 1 ? "share" : "shares"}; filled ${Math.abs(filledShares)} ${Math.abs(filledShares) === 1 ? "share" : "shares"}. `
                + `Trade fee: ${money(tradeFee)}. `
                + `The stock moved ${signedMoney(stockPrice - previousPrice)}; your balance changed by ${signedMoney(balance() - previousBalance)}.`;
            if (cash <= 0) finishGame();
        }

        function reset() {
            cash = STARTING_CASH;
            stockPrice = STARTING_PRICE;
            position = 0;
            round = 0;
            priceHistory = [STARTING_PRICE];
            balanceHistory = [STARTING_CASH];
            slider.disabled = false;
            tradeButton.disabled = false;
            slider.value = "0";
            generateNextMove();
            updateDisplay();
            summary.textContent = "New game started. The next move is ready for your prediction.";
        }

        slider.addEventListener("input", updateDisplay);
        tradeButton.addEventListener("click", play);
        resetButton.addEventListener("click", reset);
        reset();
    }

    function mount() {
        document.querySelectorAll(".game4").forEach(createGame);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount);
    } else {
        mount();
    }
})();
