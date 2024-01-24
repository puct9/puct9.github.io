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

const sleep = time => {
    return new Promise((resolve) => setTimeout(resolve, time));
}

const clip = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

const downloadWithProgressBar = async (parent, uri) => {
    const statusText = document.createElement('p');
    parent.appendChild(statusText);
    statusText.innerText = `Downloading ${uri}`;

    const response = await fetch(uri);
    const contentLength = +response.headers.get('Content-Length');

    // https://stackoverflow.com/a/64123890/5524761 xdd
    let loaded = 0;
    const res = new Response(new ReadableStream({
        async start(controller) {
            const reader = response.body.getReader();
            for (; ;) {
                const { done, value } = await reader.read();
                if (done) break;
                loaded += value.byteLength;
                statusText.innerText = `Downloading... ${uri}, ${(100 * loaded / contentLength).toFixed(2)}% complete`;
                controller.enqueue(value);
            }
            controller.close();
        },
    }));

    const data = await res.arrayBuffer();
    parent.removeChild(statusText);
    return data;
};

class Display {
    constructor(parent, displayHeight, displayWidth, imageHeight, imageWidth) {
        this.displayHeight = displayHeight;
        this.displayWidth = displayWidth;
        this.imageHeight = imageHeight;
        this.imageWidth = imageWidth;

        this.canvas = document.createElement('canvas');
        this.canvas.height = displayHeight;
        this.canvas.width = displayWidth;
        parent.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.scale(displayHeight / imageHeight, displayWidth / imageWidth);

        this.temp = document.createElement('canvas');
        this.tempCtx = this.temp.getContext('2d');
    }

    showImage(imgData) {
        this.tempCtx.putImageData(imgData, 0, 0);
        this.ctx.drawImage(this.temp, 0, 0);
    }

    hide() { this.canvas.hidden = true; }
    unhide() { this.canvas.hidden = false; }
}

class Dream {
    constructor(parent, rssmSessProvider, zhTransformSessProvider, decoderSessProvider, zhToImageAuxSessProvider) {
        this.parent = parent;
        // Display
        this.gameDisplay = new Display(parent, 480, 480, 64, 64);
        parent.appendChild(document.createElement('br'));
        this.zDistDisplay = new Display(parent, 160, 160, 32, 32);
        this.zSampleDisplay = new Display(parent, 160, 160, 32, 32);
        this.hDisplay = new Display(parent, 80, 160, 16, 32);

        // Init inference sessions
        this.rssmSess = undefined;
        this.zhTransformSess = undefined;
        this.decoderSess = undefined;
        this.zhToImageAuxSess = undefined;

        // Button to prompt loading of the game
        const btn = document.createElement('button');
        btn.innerText = "Press to load (~40MB)";
        this.gameDisplay.hide();
        this.zDistDisplay.hide();
        this.zSampleDisplay.hide();
        this.hDisplay.hide();
        btn.onclick = () => {
            btn.hidden = true;
            this.loadAndStartGame(
                rssmSessProvider,
                zhTransformSessProvider,
                decoderSessProvider,
                zhToImageAuxSessProvider,
            );
        };
        this.waitReady().then(() => {
            this.gameDisplay.unhide();
            this.zDistDisplay.unhide();
            this.zSampleDisplay.unhide();
            this.hDisplay.unhide();
        });
        parent.appendChild(btn);

        // Model state
        const z = arrayZeros([1, 32, 32]);
        const h = arrayZeros([1, 512]);
        const a = [[1, 0, 0, 0, 0]];
        this.z = new ort.Tensor('float32', z.flat(2), [1, 32, 32]);
        this.h = new ort.Tensor('float32', h.flat(2), [1, 512]);
        this.a = new ort.Tensor('float32', a.flat(2), [1, 5]);

        // User controls
        this.pressed = { w: false, a: false, s: false, d: false };
        window.addEventListener("keydown", e => {
            if (this.pressed[e.key] !== undefined) {
                this.pressed[e.key] = true;
            }
        });
        window.addEventListener("keyup", e => {
            if (this.pressed[e.key] !== undefined) {
                this.pressed[e.key] = false;
            }
        });
    }

    ready() {
        return (
            this.rssmSess !== undefined &&
            this.zhTransformSess !== undefined &&
            this.decoderSess !== undefined &&
            this.zhToImageAuxSess !== undefined
        )
    }

    async waitReady() {
        await sleep(100);
        if (!this.ready()) { return this.waitReady(); }
    }

    loadAndStartGame(rssmSessProvider, zhTransformSessProvider, decoderSessProvider, zhToImageAuxSessProvider) {
        rssmSessProvider(this.parent).then(sess => { this.rssmSess = sess; });
        zhTransformSessProvider(this.parent).then(sess => { this.zhTransformSess = sess; });
        decoderSessProvider(this.parent).then(sess => { this.decoderSess = sess; });
        zhToImageAuxSessProvider(this.parent).then(sess => { this.zhToImageAuxSess = sess; });

        this.waitReady().then(() => this.play());
    }

    async play() {
        await this.waitReady();

        // Sometimes a combination of acceleration and steering is demanded by the user
        // This is not supported by the controls, so fix that by just rapidly alternating between the two
        let steeringPriority = 0;
        for (; ;) {
            const startTime = Date.now();
            
            steeringPriority = (steeringPriority + 1) % 3;
            const steering = this.pressed.a - this.pressed.d;
            this.a.data.fill(0);
            if ((steeringPriority || (!this.pressed.s && !this.pressed.w)) && steering !== 0) {
                this.a.data[1 + (steering + 1) / 2] = 1;
            } else if (this.pressed.s) {
                this.a.data[4] = 1;
            } else if (this.pressed.w) {
                this.a.data[3] = 1;
            } else {
                this.a.data[0] = 1;
            }
            console.log(this.a.data);

            const res = await this.rssmSess.run({ prev_z: this.z, prev_a: this.a, prev_h: this.h });
            // TODO: Can do away with this.z, h
            this.z = res.z_sample;
            this.h = res.h;

            const state = await this.zhTransformSess.run({ z: this.z, h: this.h });
            // NN modified in the exporting process to accommodate HWC and RGBA
            const fp32px = (await this.decoderSess.run(state)).image.data;
            const u8px = Uint8ClampedArray.from(fp32px, x => clip(x * 255, 0, 255));
            const imgData = new ImageData(u8px, 64, 64);

            // Sadly, I am too stupid to find a better way
            // Draw decoder output image
            this.gameDisplay.showImage(imgData);

            // TODO: Draw latent images
            const latentImages = await this.zhToImageAuxSess.run(res);

            const zDistU8px = Uint8ClampedArray.from(latentImages.z_probs_img.data, x => clip(x * 255, 0, 255));
            const zDistImgData = new ImageData(zDistU8px, 32, 32);
            this.zDistDisplay.showImage(zDistImgData);

            const zSampleU8px = Uint8ClampedArray.from(latentImages.z_sample_img.data, x => clip(x * 255, 0, 255));
            const zSampleImgData = new ImageData(zSampleU8px, 32, 32);
            this.zSampleDisplay.showImage(zSampleImgData);

            const hU8px = Uint8ClampedArray.from(latentImages.h_img.data, x => clip(x * 255, 0, 255));
            const hImgData = new ImageData(hU8px, 32, 16);
            this.hDisplay.showImage(hImgData);

            // The game naturally runs ~50FPS
            const endTime = Date.now();
            await sleep(Math.max(5, 1000 / 50 - (endTime - startTime)));
        }
    }
}

const createSessionProvider = modelPath => {
    return async dlParent => {
        // { executionProviders: ['webgl'] } for webgl, but some operations don't work
        // and wasm seems to work well enough anyways :)
        const dl = await downloadWithProgressBar(dlParent, modelPath);
        const sess = await ort.InferenceSession.create(dl);
        return sess;
    }
};

const initGames = () => {
    const games = document.getElementsByClassName("game");
    for (let d of games) {
        const game = new Dream(
            d,
            createSessionProvider(d.getAttribute("rssm")),
            createSessionProvider(d.getAttribute("zh-transform")),
            createSessionProvider(d.getAttribute("decoder")),
            createSessionProvider(d.getAttribute("zh-to-image-aux")),
        );
    }
};

initGames();
