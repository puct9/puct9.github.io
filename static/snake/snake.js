const Direction2Delta = Object.freeze({
    UP: [-1, 0],
    DOWN: [1, 0],
    LEFT: [0, -1],
    RIGHT: [0, 1],
});
const NnIdx2Direction = Object.freeze({
    0: Direction2Delta.UP,
    1: Direction2Delta.DOWN,
    2: Direction2Delta.LEFT,
    3: Direction2Delta.RIGHT,
});
const NnIdx2String = Object.freeze({
    0: 'UP',
    1: 'DOWN',
    2: 'LEFT',
    3: 'RIGHT',
});
const Direction2NnIdx = (direction) => {
    if (direction[0] == -1 && direction[1] == 0) {
        return 0;
    } else if (direction[0] == 1 && direction[1] == 0) {
        return 1;
    } else if (direction[0] == 0 && direction[1] == -1) {
        return 2;
    } else if (direction[0] == 0 && direction[1] == 1) {
        return 3;
    }
}

const arrayZeros = (shape) => {
    if (shape.length === 0) {
        return 0;
    }
    const [d1, ...rest] = shape;
    let res = [];
    for (let i = 0; i < d1; i++) {
        res[i] = arrayZeros(rest);
    }
    return res;
}

const sleep = (time) => {
    return new Promise((resolve) => setTimeout(resolve, time));
}

class SnakeGame {
    constructor(parent) {
        this.parent = parent;
        const pixels = parent.offsetWidth;
        const gridPx = pixels / 8;

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttributeNS(null, "viewBox", "0 0 " + pixels + " " + pixels);
        svg.setAttributeNS(null, "width", pixels);
        svg.setAttributeNS(null, "height", pixels);

        this.rects = [];
        for (let r = 0; r < 8; r++) {
            this.rects[r] = [];
            for (let c = 0; c < 8; c++) {
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', gridPx * c);
                rect.setAttribute('y', gridPx * r);
                rect.setAttribute('width', gridPx);
                rect.setAttribute('height', gridPx);
                rect.setAttribute('fill', 'rgb(0, 0, 0)');
                svg.appendChild(rect);
                this.rects[r][c] = rect;
            }
        }

        for (let i = 1; i < 8; i++) {
            const horizontal = document.createElementNS("http://www.w3.org/2000/svg", "line");
            horizontal.setAttribute('x1', 0);
            horizontal.setAttribute('y1', i * gridPx);
            horizontal.setAttribute('x2', pixels);
            horizontal.setAttribute('y2', i * gridPx);
            horizontal.setAttribute('stroke', 'rgb(0, 0, 0)');
            svg.appendChild(horizontal);

            const vertical = document.createElementNS("http://www.w3.org/2000/svg", "line");
            vertical.setAttribute('x1', i * gridPx);
            vertical.setAttribute('y1', 0);
            vertical.setAttribute('x2', i * gridPx);
            vertical.setAttribute('y2', pixels);
            vertical.setAttribute('stroke', 'rgb(0, 0, 0)');
            svg.appendChild(vertical);
        }

        parent.appendChild(svg);

        this.newGame();
    }

    newGame() {
        this.movesWithoutFood = 0;
        this.snake = [[2, 2], [2, 3]];
        this.direction = Direction2Delta.RIGHT;
        this.addFood();

        this.prevState = arrayZeros([2, 8, 8]);
        this.currState = this.stateNoHistory();

        this.draw();
    }

    addFood() {
        let hasSnake = this.snakeMask();
        this.food = [Math.floor(Math.random() * 8), Math.floor(Math.random() * 8)];
        while (hasSnake[this.food[0]][this.food[1]] !== 0) {
            this.food = [Math.floor(Math.random() * 8), Math.floor(Math.random() * 8)];
        }
    }

    draw() {
        for (let row of this.rects) {
            for (let rect of row) {
                rect.setAttribute('fill', 'rgb(0, 0, 0)');
            }
        }
        const state = this.currState[0];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                this.rects[r][c].setAttribute('fill', `rgb(0, ${state[r][c] * 255}, 0)`);
            }
        }
        this.rects[this.food[0]][this.food[1]].setAttribute('fill', 'rgb(255, 0, 0)');

        this.nnState();
    }

    snakeMask() {
        let state = arrayZeros([8, 8]);
        for (let i = 0; i < this.snake.length; i++) {
            let [r, c] = this.snake[i];
            state[r][c] = 1;
        }
        return state;
    }

    stateNoHistory() {
        let state = arrayZeros([2, 8, 8]);
        for (let i = 0; i < this.snake.length; i++) {
            let [r, c] = this.snake[i];
            let brightness = 0.1 + (i / (this.snake.length - 1)) * 0.9;
            state[0][r][c] = brightness;
        }
        state[1][this.food[0]][this.food[1]] = 1;
        return state;
    }

    snakeHead() {
        return this.snake[this.snake.length - 1];
    }

    move(direction) {
        if (direction[0] + this.direction[0] !== 0 || direction[1] + this.direction[1] !== 0) {
            this.direction = direction;
        }
        const newHead = [this.snakeHead()[0] + this.direction[0], this.snakeHead()[1] + this.direction[1]];
        if (newHead[0] < 0 || newHead[0] >= 8 || newHead[1] < 0 || newHead[1] >= 8 || this.currState[0][newHead[0]][newHead[1]] > 0.1) {
            this.newGame();
            return;
        }

        this.snake.push(newHead);
        if (newHead[0] === this.food[0] && newHead[1] === this.food[1]) {
            this.movesWithoutFood = 0;
            if (this.snake.length === 64) {
                this.newGame();
                return;
            }
            this.addFood();
        } else {
            this.snake.shift();
        }

        this.prevState = this.currState;
        this.currState = this.stateNoHistory();

        if (this.movesWithoutFood++ === 64) {
            this.newGame();
            return;
        }
        this.draw();
    }

    nnState() {
        let nnArr = this.currState.flat(2);
        for (let i = 128; i < 132; i++) {
            nnArr[i] = 0;
        }
        nnArr[128 + Direction2NnIdx(this.direction)] = 1;
        return nnArr;
    }
}

const playGame = async (game, sessionProvider) => {
    const sess = await sessionProvider();

    const checkVisible = () => {
        var rect = game.parent.getBoundingClientRect();
        var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
        return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
    }

    while (true) {
        await sleep(25);
        if (!checkVisible()) {
            continue;
        }
        const nnArr = game.nnState();
        const data = Float32Array.from(nnArr);
        const inp = new ort.Tensor('float32', data, [1, 132]);
        const res = await sess.run({ input: inp });

        const logA = res.actor.data;
        let a = [];
        for (let i = 0; i < 4; i++) {
            a[i] = Math.exp(logA[i]);
        }
        // const value = res.critic.data[0];
        // const aMax = a.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);

        const rand = Math.random();
        let cum = 0;
        let move = 0;
        for (let i = 0; i < 4; i++) {
            cum += a[i];
            move = i;
            if (cum >= rand) {
                break;
            }
        }

        game.move(NnIdx2Direction[move]);
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
        playGame(new SnakeGame(d), createSessionProvider(d.getAttribute("model")));
    }
}

initGames();
