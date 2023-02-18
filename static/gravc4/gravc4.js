const arrayFill = value => {
    const inner = shape => {
        if (shape.length === 0) {
            return value;
        }
        const [d1, ...rest] = shape;
        let res = [];
        for (let i = 0; i < d1; i++) {
            res[i] = inner(rest);
        }
        return res;
    }
    return inner;
}
const arrayZeros = arrayFill(0);

const arrayClone = arr => {
    if (arr[0].length === undefined) {
        return [...arr];
    } else {
        let res = [];
        for (let i = 0; i < arr.length; i++) {
            res[i] = arrayClone(arr[i]);
        }
        return res;
    }
}

const sleep = (time) => {
    return new Promise((resolve) => setTimeout(resolve, time));
}

class GravC4 {
    constructor(parent, sessProvider) {
        const width = parent.getAttribute("game-width");
        const height = parent.getAttribute("game-height");
        this.width = width;
        this.height = height;

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttributeNS(null, "viewBox", "0 0 " + width + " " + height);
        svg.setAttributeNS(null, "width", width);
        svg.setAttributeNS(null, "height", height);
        svg.style.backgroundColor = "rgb(27, 97, 240)";
        svg.style.userSelect = "none";

        this.gridPx = width / 7;
        this.circles = [];
        for (let r = 0; r < 6; r++) {
            this.circles[r] = [];
            for (let c = 0; c < 7; c++) {
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", (0.5 + c) * this.gridPx);
                circle.setAttribute("cy", (0.5 + r) * this.gridPx);
                circle.setAttribute("r", this.gridPx / 2.1);
                circle.setAttribute("fill", "#ebebeb");
                this.circles[r][c] = circle;
                svg.appendChild(circle);
            }
        }
        this.probRects = [];
        for (let c = 0; c < 7; c++) {
            const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bg.setAttribute("x", (c + (1 - 0.9) / 2) * this.gridPx);
            bg.setAttribute("y", (6 + 0.5 / 3) * this.gridPx);
            bg.setAttribute("width", 0.9 * this.gridPx);
            bg.setAttribute("height", 0.25 * this.gridPx);
            bg.setAttribute("fill", "#ebebeb");

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", (c + (1 - 0.9) / 2) * this.gridPx);
            rect.setAttribute("y", (6 + 0.5 / 3) * this.gridPx);
            rect.setAttribute("height", 0.25 * this.gridPx);
            rect.setAttribute("fill", "rgb(80, 200, 120)");

            const setFill = p => {
                rect.setAttribute("width", 0.9 * p * this.gridPx);
            }
            setFill(0);

            this.probRects[c] = { rect, setFill };
            svg.appendChild(bg);
            svg.appendChild(rect);
        }

        const evalRectRed = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        evalRectRed.setAttribute("x", 0.05 * width);
        evalRectRed.setAttribute("y", (6 + 0.5 / 3 + 0.25 + 0.5 / 3) * this.gridPx);
        evalRectRed.setAttribute("width", 0.9 * width);
        evalRectRed.setAttribute("height", 0.25 * this.gridPx);
        evalRectRed.setAttribute("fill", "rgb(225, 31, 39)");

        const evalRectYellow = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        evalRectYellow.setAttribute("x", 0.05 * width);
        evalRectYellow.setAttribute("y", (6 + 0.5 / 3 + 0.25 + 0.5 / 3) * this.gridPx);
        evalRectYellow.setAttribute("height", 0.25 * this.gridPx);
        evalRectYellow.setAttribute("fill", "rgb(255, 216, 7)");

        const evalRectCover = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        evalRectCover.setAttribute("x", 0.05 * width);
        evalRectCover.setAttribute("y", (6 + 0.5 / 3 + 0.25 + 0.5 / 3) * this.gridPx);
        evalRectCover.setAttribute("width", 0.9 * width);
        evalRectCover.setAttribute("height", 0.25 * this.gridPx);
        evalRectCover.setAttribute("fill", "rgba(235, 235, 235, 1)");

        this.setEval = qualityForYellow => {
            evalRectCover.setAttribute("fill", "rgba(235, 235, 235, 0)");
            const p = (qualityForYellow + 1) / 2;
            evalRectYellow.setAttribute("width", 0.9 * p * width);
        };
        this.hideEval = () => {
            evalRectCover.setAttribute("fill", "rgba(235, 235, 235, 1)");
        };
        svg.appendChild(evalRectRed);
        svg.appendChild(evalRectYellow);
        svg.appendChild(evalRectCover);



        svg.onclick = ({ offsetX }) => {
            try {
                this.playMove(Math.floor(offsetX / this.gridPx));
            } catch (e) {
                return;
            }
            return false;
        }

        parent.appendChild(svg);

        parent.appendChild(document.createElement("br"));

        const thinkBtn = document.createElement("button");
        thinkBtn.innerText = "Make the computer think";
        thinkBtn.onclick = () => {
            this.evaluate()
                .catch(e => {});
        };
        parent.appendChild(thinkBtn);

        const resetBtn = document.createElement("button");
        resetBtn.innerText = "Reset";
        resetBtn.onclick = () => {
            this.doNotSearch = true;
            this.currPosMcts = undefined;
            this.probRects.forEach(({ setFill }) => setFill(0));
            this.hideEval();
            this.game = new Game();
            this.draw();
        };
        parent.appendChild(resetBtn);

        this.game = new Game();
        this.draw();

        this.sess = undefined;
        sessProvider().then(sess => { this.sess = sess; });
    }

    draw() {
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 7; c++) {
                const circle = this.circles[r][c];
                if (this.game.state[0][r][c] !== 0) {
                    circle.setAttribute("fill", "rgb(225, 31, 39)");
                } else if (this.game.state[1][r][c]) {
                    circle.setAttribute("fill", "rgb(255, 216, 7)");
                } else {
                    circle.setAttribute("fill", "#ebebeb");
                }
            }
        }
    }

    playMove(col) {
        this.game.playMove(col);
        this.draw();

        this.doNotSearch = true;
        this.currPosMcts = undefined;
        this.probRects.forEach(({ setFill }) => setFill(0));
        this.hideEval();
    }

    async evaluate() {
        if (this.sess === undefined) {
            console.log('sess not ready');
            return;
        }
        if (this.busy) {
            return;
        }
        this.busy = true;
        this.doNotSearch = false;
        const mcts = this.currPosMcts === undefined ? new Mcts(this.game, this.sess) : this.currPosMcts;
        this.currPosMcts = mcts;
        this.probRects.forEach(({ setFill }) => setFill(0));
        for (let i = 0; i < 200 && !this.doNotSearch; i++) {
            await mcts.playouts(5);
            this.setEval(-mcts.root.q() * (this.game.numMoves % 2 === 1 ? 1 : -1));
            mcts.root.children.forEach(({ p, n, moveIndex }) => this.probRects[moveIndex].setFill(mcts.root.n ? n / (mcts.root.n - 1) : p));
            await sleep(5);
        }
        this.busy = false;
    }
}

class Game {
    constructor() {
        this.state = arrayZeros([4, 6, 7]);
        this.numMoves = 0;
        this.piecesTop = arrayZeros([7]);
        this.piecesBottom = arrayZeros([7]);
        this.lastMove = undefined;
        this.gameOver = false;
    }

    playMove(col) {
        if (this.gameOver) {
            throw new Error('Game already over');
        }
        if (this.piecesTop[col] + this.piecesBottom[col] === 6) {
            throw new Error('Illegal move');
        }
        const ourPlane = this.numMoves % 2;
        let row;
        if (this.numMoves % 4 > 1) {
            row = this.piecesTop[col]++;
            this.state[ourPlane][row][col] = 1;
        } else {
            row = 6 - (++this.piecesBottom[col]);
            this.state[ourPlane][row][col] = 1;
        }

        this.numMoves++;
        this.state[2] = arrayFill(this.numMoves % 2)([6, 7]);
        this.state[3] = arrayFill(this.numMoves % 4 > 1 ? 1 : 0)([6, 7]);

        this.lastMove = [row, col];

        this.gameOver |= this.checkWin() | (this.numMoves == 42);
    }

    checkWin() {
        if (this.lastMove === undefined) {
            return false;
        }
        const [r, c] = this.lastMove;
        const ourPlane = (this.numMoves - 1) % 2;

        const chainLength = (dr, dc) => {
            let res = 0;
            let _r = r;
            let _c = c;
            while (0 <= _r && _r < 6 && 0 <= _c && _c < 7 && this.state[ourPlane][_r][_c] !== 0) {
                res++;
                _r += dr;
                _c += dc;
            }
            return res;
        }

        const halfTheDeltas = [
            [-1, 0],
            [-1, 1],
            [0, 1],
            [1, 1],
        ];
        for (let [dr, dc] of halfTheDeltas) {
            if (chainLength(dr, dc) + chainLength(-dr, -dc) - 1 >= 4) {
                return true;
            }
        }
        return false;
    }

    async evaluate(sess) {
        const arr = this.state.flat(3);
        const data = Float32Array.from(arr);
        const inp = new ort.Tensor('float32', data, [1, 4, 6, 7]);
        const res = await sess.run({ board: inp });

        // res has { policy, value }
        const isLegal = idx => this.piecesBottom[idx] + this.piecesTop[idx] < 6;
        const policyLogProbs = Array.from(res.policy.data);
        const legalMovesProbSum = policyLogProbs.reduce((cum, val, idx) => cum + Math.exp(val) * isLegal(idx),
            1e-7
        );
        const probs = policyLogProbs.map((val, idx) => isLegal(idx) * Math.exp(val) / legalMovesProbSum);
        return { policy: probs, value: res.value.data[0] };
    }

    clone() {
        let n = new Game();
        n.state = arrayClone(this.state);
        n.numMoves = this.numMoves;
        n.piecesTop = arrayClone(this.piecesTop);
        n.piecesBottom = arrayClone(this.piecesBottom);
        n.lastMove = this.lastMove !== undefined ? arrayClone(this.lastMove) : undefined;
        n.gameOver = this.gameOver;
        return n;
    }
}

class Mcts {
    constructor(game, sess) {
        this.game = game.clone();
        this.sess = sess;
        this.root = new Node(undefined, -1, -1, undefined);
    }

    async playout() {
        let pos = this.game.clone();
        let leaf = this.root.toLeaf(pos);
        if (leaf.res !== undefined) {
            leaf.backprop(1 * leaf.res);
            return;
        }

        const { policy, value } = await pos.evaluate(this.sess);
        leaf.expand(pos, policy);
        leaf.backprop(-value);
    }

    async playouts(n) {
        for (let i = 0; i < n; i++) {
            await this.playout();
        }
    }
}

class Node {
    constructor(parent, moveIndex, prior, res) {
        this.parent = parent;
        this.moveIndex = moveIndex;
        this.p = prior;
        this.res = res;
        this.n = 0;
        this.w = 0;
        this.children = [];
    }

    q() {
        return this.n ? this.w / this.n : 0;
    }

    ucbScore() {
        if (this.res !== undefined) {
            return 999;
        }
        return this.q() + (Math.log((this.parent.n + 19653) / 19652) + 2) * this.p * Math.sqrt(this.parent.n) / (this.n + 1);
    }

    toLeaf(game) {
        if (this.children.length === 0) {
            return this;
        }
        const best = this.children.reduce(
            (cum, curr) => {
                if (cum.ucbScore() > curr.ucbScore()) {
                    return cum;
                } else {
                    return curr;
                }
            },
            this.children[0]
        );
        game.playMove(best.moveIndex);
        return best.toLeaf(game);
    }

    expand(game, priors) {
        if (this.n) {
            throw new Error("Node already expanded");
        }
        if (this.res !== undefined) {
            return;
        }
        const legals = [...Array(7).keys()].map(idx => game.piecesTop[idx] + game.piecesBottom[idx] < 6);
        legals.forEach(
            (val, idx) => {
                if (!val) {
                    return;
                }
                const cpy = game.clone();
                cpy.playMove(idx);
                if (cpy.gameOver) {
                    this.children.push(new Node(this, idx, priors[idx], cpy.checkWin()));
                } else {
                    this.children.push(new Node(this, idx, priors[idx], undefined));
                }
            }
        );
    }

    backprop(negativePositionW) {
        this.w += negativePositionW;
        this.n++;

        if (this.parent !== undefined) {
            this.parent.backprop(-negativePositionW);
        }
    }
}

const createSessionProvider = (modelPath) => {
    let sess = undefined;
    return async () => {
        if (sess === undefined) {
            sess = await ort.InferenceSession.create(modelPath);
        }
        return sess;
    }
};

const initGames = () => {
    const games = document.getElementsByClassName("game");
    for (let d of games) {
        new GravC4(d, createSessionProvider(d.getAttribute("model")));
    }
}

initGames();
