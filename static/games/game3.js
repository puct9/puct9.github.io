(() => {
    "use strict";

    const STARTING_BALANCE_CENTS = 10000;
    const FEE_RATE = 0.173;
    const HEADS_CHANCE = 0.7;
    const COIN_COUNT = 3;
    const CORRELATION_THRESHOLD = 0.75;
    const CORRELATION_CHANCE = 0.2;
    const MAX_BALANCE_CENTS = 100000000;

    function money(cents) {
        return `$${(cents / 100).toFixed(2)}`;
    }

    function signedMoney(cents) {
        return `${cents >= 0 ? "+" : "-"}$${Math.abs(cents / 100).toFixed(2)}`;
    }

    function createGame(parent) {
        let balanceCents = STARTING_BALANCE_CENTS;
        let round = 0;
        let balanceHistory = [STARTING_BALANCE_CENTS];

        parent.innerHTML = `
            <div class="game3-panel" style="position: relative; max-width: 34rem; padding: 1rem; border: 1px solid #ccc; border-radius: 0.4rem;">
                <button type="button" data-reset style="position: absolute; top: 1rem; right: 1rem;">Reset</button>
                <p style="margin-top: 0; padding-right: 4rem;"><strong>Balance: <span data-balance></span></strong></p>
                <canvas data-chart width="600" height="180" aria-label="Chart showing balance over time" style="display: block; width: 100%; height: 180px; margin-bottom: 1rem;"></canvas>
                <p>Place your total bet across three coins. Each coin's share pays if it lands heads, and loses if it lands tails. A 17.3% fee is charged after every round.</p>
                <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: end;">
                    <label>Bet (%)<br><input data-percent type="number" min="0.01" max="100" step="0.01" inputmode="decimal"></label>
                    <span>Bet amount: <strong data-dollar></strong></span>
                    <label>Number of bets<br><input data-count type="number" min="1" step="1" value="100" inputmode="numeric"></label>
                </div>
                <p style="margin-bottom: 0.5rem;"><button type="button" data-play>Bet heads on all 3 coins</button></p>
                <p aria-live="polite" data-summary style="min-height: 1.5em; margin-bottom: 0;"></p>
            </div>`;

        const balance = parent.querySelector("[data-balance]");
        const chart = parent.querySelector("[data-chart]");
        const dollarAmount = parent.querySelector("[data-dollar]");
        const percentInput = parent.querySelector("[data-percent]");
        const countInput = parent.querySelector("[data-count]");
        const summary = parent.querySelector("[data-summary]");
        const resetButton = parent.querySelector("[data-reset]");
        const playButton = parent.querySelector("[data-play]");

        function updateBalance() {
            balance.textContent = money(balanceCents);
            drawChart();
        }

        function drawChart() {
            const context = chart.getContext("2d");
            if (!context) return;
            const width = chart.clientWidth || 600;
            const height = 180;
            const scale = window.devicePixelRatio || 1;
            chart.width = width * scale;
            chart.height = height * scale;
            context.setTransform(scale, 0, 0, scale, 0, 0);
            context.clearRect(0, 0, width, height);

            const maximum = Math.max(...balanceHistory, STARTING_BALANCE_CENTS);
            context.font = "12px sans-serif";
            const labelWidth = Math.max(context.measureText(money(maximum)).width, context.measureText("$0.00").width);
            const padding = { top: 12, right: 12, bottom: 24, left: labelWidth + 12 };
            const plotWidth = width - padding.left - padding.right;
            const plotHeight = height - padding.top - padding.bottom;
            const x = index => padding.left + (balanceHistory.length === 1 ? plotWidth : (index / (balanceHistory.length - 1)) * plotWidth);
            const y = value => padding.top + plotHeight - (value / maximum) * plotHeight;

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
            context.fillText("$0.00", padding.left - 6, padding.top + plotHeight + 4);
            context.strokeStyle = "#1769aa";
            context.lineWidth = 2;
            context.beginPath();
            balanceHistory.forEach((value, index) => {
                if (index === 0) context.moveTo(x(index), y(value));
                else context.lineTo(x(index), y(value));
            });
            context.stroke();
        }

        function updateDollarFromPercent() {
            const value = Number(percentInput.value);
            if (percentInput.value === "" || !Number.isFinite(value)) {
                dollarAmount.textContent = "$0.00";
                return;
            }
            const amountCents = value > 0 ? Math.max(1, Math.round((balanceCents * value) / 100)) : 0;
            dollarAmount.textContent = money(amountCents);
        }

        function finishGame(message) {
            playButton.disabled = true;
            percentInput.disabled = true;
            countInput.disabled = true;
            summary.textContent += ` ${message}`;
        }

        function reset() {
            balanceCents = STARTING_BALANCE_CENTS;
            round = 0;
            balanceHistory = [STARTING_BALANCE_CENTS];
            playButton.disabled = false;
            percentInput.disabled = false;
            countInput.disabled = false;
            percentInput.value = "1";
            updateBalance();
            updateDollarFromPercent();
            summary.textContent = "New game started.";
        }

        function flipCoins(isLargeBet) {
            if (isLargeBet && Math.random() < CORRELATION_CHANCE) {
                const allHeads = Math.random() < HEADS_CHANCE;
                return Array(COIN_COUNT).fill(allHeads);
            }
            return Array.from({ length: COIN_COUNT }, () => Math.random() < HEADS_CHANCE);
        }

        function splitBet(betCents) {
            const shareCents = Math.floor(betCents / COIN_COUNT);
            const remainder = betCents % COIN_COUNT;
            return Array.from({ length: COIN_COUNT }, (_, index) => shareCents + (index < remainder ? 1 : 0));
        }

        function play() {
            if (balanceCents <= 0) {
                summary.textContent = "You are broke!";
                return;
            }
            const betPercent = Number(percentInput.value);
            const count = Math.floor(Number(countInput.value));
            if (!Number.isFinite(betPercent) || betPercent < 0.01 || betPercent > 100) {
                summary.textContent = "Enter a percentage bet between 0.01% and 100%.";
                percentInput.focus();
                return;
            }
            if (!Number.isFinite(count) || count < 1) {
                summary.textContent = "Enter at least one bet.";
                countInput.focus();
                return;
            }

            const startingBalanceCents = balanceCents;
            let wins = 0;
            let losses = 0;
            let feeCentsTotal = 0;
            let betsPerformed = 0;
            for (let i = 0; i < count; i += 1) {
                const betCents = Math.max(1, Math.round((balanceCents * betPercent) / 100));
                if (betCents > balanceCents) break;
                round += 1;
                const flips = flipCoins(betPercent >= CORRELATION_THRESHOLD * 100);
                const coinBets = splitBet(betCents);
                const coinWins = flips.filter(Boolean).length;
                wins += coinWins;
                losses += COIN_COUNT - coinWins;
                const netChangeCents = flips.reduce((change, isHeads, index) => {
                    return change + (isHeads ? coinBets[index] : -coinBets[index]);
                }, 0);
                const beforeFeeCents = balanceCents + netChangeCents;
                const feeCents = Math.ceil(beforeFeeCents * FEE_RATE);
                feeCentsTotal += feeCents;
                balanceCents = beforeFeeCents - feeCents;
                balanceHistory.push(balanceCents);
                betsPerformed += 1;
                if (balanceCents > MAX_BALANCE_CENTS) break;
            }
            updateBalance();
            const changeCents = balanceCents - startingBalanceCents;
            summary.textContent = `Performed ${betsPerformed} of ${count} requested rounds: ${wins} coin wins and ${losses} coin losses. `
                + `Fees: ${money(feeCentsTotal)}. Balance changed by ${signedMoney(changeCents)} to ${money(balanceCents)}.`;
            if (balanceCents > MAX_BALANCE_CENTS) {
                finishGame("You passed $1,000,000.00, so the game is over.");
            } else if (balanceCents <= 0) {
                finishGame("You are out of money. Press Reset to play again.");
            } else {
                updateDollarFromPercent();
            }
        }

        percentInput.addEventListener("input", updateDollarFromPercent);
        resetButton.addEventListener("click", reset);
        playButton.addEventListener("click", play);
        reset();
    }

    function mount() {
        document.querySelectorAll(".game3").forEach(createGame);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount);
    } else {
        mount();
    }
})();
