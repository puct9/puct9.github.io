---
layout: post
title:  "A Reinforcement Learning Approach to 5 in a Row"
date:   2022-07-08 01:24:00 +1000
categories: cpp game machine learning
---
<style>
    .svg-game {
        background-color: rgb(242, 175, 96);
    }
    .game {
        width: 400px;
        height: 400px;
        margin-block-end: 1em;
    }
</style>

# A Reinforcement Learning Approach to 5 in a Row

Technologies:
- Windows/Linux
- Python
- Keras
- C++

## The task

5 in a row is a simple and popular board game played between two players where the objective is to chain exactly 5 of your pieces in a line to win. The game is typically played on a 15x15 board, though many play on a 19x19 board meant for playing Go instead.

<div class="game" position="125,155,141,157,156,126,142,140,170,184,154,171,139,153,128,114,143,112,124,109,138,122,144,145,186,202,158,98,84,130,173,82,113">
</div>

*Sample position that may arise in a game of 5 in a row. The piece with the red square was the last move to be made.*

How can we make a computer play this game well?

## The theory

You might have heard of [Monte Carlo Tree Search](https://en.wikipedia.org/wiki/Monte_Carlo_tree_search) (MCTS). It has one particular component - the random simulation used to approximate the value (i.e., the probability of winning) of a particular position. This has proven to work well with games like Go, with most to all of the state-of-the-art Go playing programs of the previous era using this approach.

However, this does not work well with games like Chess and 5 in a row, especially due to their extremely tactical nature - it isn't abnormal to have positions where a completely winning position can become completely lost with just 1 move. This makes the random simulations often produce high-variance and inaccurate results, greatly hurting the playing strength of the program.

The solution is to replace the random simulations which return -1 for lost, +1 for won, and 0 for drawn with a neural network that returns some value between -1 and 1 approximating the winning chances of the position. This neural network is called the *value net/network*.

However, suppose you have 225 possible moves to play. You would need to evaluate all of them with the value network to figure out which move is best. So in addition to the value net, we use a policy net which returns the probabilities of a move to be played given an input position, assuming better moves have higher probability to be played. This neural network is called the *policy net/network*.

So to summarise:

| Neural network | Input | Output |
| -------------- | ----- | ------ |
| Value net | Board position | Value from -1 to 1 representing expected outcome |
| Policy net | Board position | Probabilities of each move being played |

The question now turns to how we train those neural networks. The solution to this is run a handful of selfplay games where the AI plays against itself. To avoid a scenario where the pig blindly follows a carrot on a stick taped to its back (i.e., it becomes delusional because it is generating its own training data), select randomness is added to its selfplay games.

The training targets for the value net is the outcome of the game, and the training targets for the policy net is the number of playouts each move received during selfplay.

## The plan

We first need to define the inputs to the neural network. Take the below position for example.

<div class="game" position="18,19,20" board-size="6">
</div>

We use 3 key pieces of information:
- Where the black pieces are
- Where the white pieces are
- Whose turn it is to move

Each of these points gets represented as its own matrix ($6\times 6$ in this case).

Where the black pieces are:

$$
    P_B = \begin{pmatrix}
        0 & 0 & 0 & 0 & 0 & 0 \\
        0 & 0 & 0 & 0 & 0 & 0 \\
        0 & 0 & 0 & 0 & 0 & 0 \\
        1 & 0 & 1 & 0 & 0 & 0 \\
        0 & 0 & 0 & 0 & 0 & 0 \\
        0 & 0 & 0 & 0 & 0 & 0
    \end{pmatrix}
$$

Where the white pieces are:

$$
    P_W = \begin{pmatrix}
        0 & 0 & 0 & 0 & 0 & 0 \\
        0 & 0 & 0 & 0 & 0 & 0 \\
        0 & 0 & 0 & 0 & 0 & 0 \\
        0 & 1 & 0 & 0 & 0 & 0 \\
        0 & 0 & 0 & 0 & 0 & 0 \\
        0 & 0 & 0 & 0 & 0 & 0
    \end{pmatrix}
$$

Whose turn it is to move (white to move = all 0s, black to move = all 1s):

$$
    P_T = \begin{pmatrix}
        0 & 0 & 0 & 0 & 0 & 0 \\
        0 & 0 & 0 & 0 & 0 & 0 \\
        0 & 0 & 0 & 0 & 0 & 0 \\
        0 & 0 & 0 & 0 & 0 & 0 \\
        0 & 0 & 0 & 0 & 0 & 0 \\
        0 & 0 & 0 & 0 & 0 & 0
    \end{pmatrix}
$$

These define our 3 input *planes* which are all $6\times 6$ matrices. By "stacking" them together, we get a single $3\times 6\times 6$ input tensor as the input to our neural network.

As side fact, you can visualise the inputs as the $6\times 6$ dimension being image width and height, and the 3 planes representing RGB. Whilst it may seem nonsensical to imagine representing a position in a 5 in a row game as an image, any human player will tell you that it's all about the pattern recognition and intuition. In the same way, structuring the inputs like this preserves the *spatial* information about the game (where there could be connected pieces, etc.), which allows us to use *image processing* techniques such as convolutional neural networks which greatly improve playing strength.

There are many ways to define the neural network. The way described in the [original paper](https://discovery.ucl.ac.uk/id/eprint/10045895/1/agz_unformatted_nature.pdf) uses a large convolutional stack where it then splits into two "heads" for the policy and value net outputs. I scale it down a lot to save resources. You can refer to this [cheat sheet](https://adspassets.blob.core.windows.net/website/content/alpha_go_zero_cheat_sheet.png) for a very nice visualisation on how a lot of this stuff works.

Now it's time to define how the policy and value nets are going to be trained. After running the selfplay games, we have a collection of data points where we have a state $s$ (input tensor), the result $z$ (-1, 0, or 1), and search probabilities $\boldsymbol\pi$ as a normalised vector of the amount of visits each move got during selfplay. We can also get the neural network's estimates of $z$ and $\boldsymbol\pi$ as $v$ and $\mathbf{p}$. The neural network update is to reduce the squared difference between $z$ and $v$, and the cross-entropy loss between $\boldsymbol\pi$ and $\mathbf{p}$.

$$
    \boldsymbol\pi = f_{policy}(s) \\
    v = f_{value}(s)
$$

$$
    loss = (z - v)^2 - \boldsymbol\pi \cdot \log{\mathbf{p}}
$$

A L2 regularization term (typically 0.0001) is also applied to all the weights of the neural network. On top of that, we randomly flip/rotate positions in the training data to accelerate learning.

## The implementation

Training was done on a preemptible virtual machine on Google Cloud Platform (GCP) which made it so that I didn't have a whirring fan in my bedroom as I tried to sleep, on top of being cheap.

![Low cost training](/static/fiveinarow/costs.png)

At first, we can see its training games are pretty random. (Click the left and right side of the board to replay the game.)

<div class="game" position="25,185,174,81,43,10,69,68,39,8,142,17,99,136,207,145,184,180,161,199,6,200,154,102,217,216,58,192,23,28,53,5,171,187,115,133,47,48,220,159,33,163,149,63,14,182,141,51,218,60,148,215,221,219,210,179,54,84,67,11,129,166,122,120,36,175,119,70,224,155,170,214,83,131,132,173" movable>
</div>

We can also see that it's pretty clueless. The darker the blue circles are, the more consideration the AI is giving to the move.

<div class="game" position="25,185,174,81,43,10,69,68,39,8,142,17,99,136,207,145,184,180,161,199,6,200,154,102,217,216,58,192,23,28,53,5,171,187,115,133,47,48,220,159,33,163,149,63,14,182,141,51,218,60,148,215,221,219,210,179,54,84" heatmap="4,6,4,4,5,0,0,5,0,4,0,25,7,5,0,4,5,0,4,8,4,5,6,0,3,0,5,5,0,3,4,6,4,0,5,6,13,3,3,0,4,4,4,0,4,3,3,0,0,4,4,0,4,0,0,4,5,4,0,4,0,1,3,0,7,4,4,28,0,0,5,4,4,7,4,4,5,3,3,1,4,0,4,4,0,7,10,4,5,4,5,4,3,3,4,7,4,4,5,0,3,3,0,5,4,8,4,3,4,3,5,5,4,4,5,0,5,4,3,9,4,4,5,3,4,3,4,3,5,11,5,4,6,0,4,3,0,4,4,3,3,0,0,4,3,0,4,4,0,0,7,4,4,4,0,4,1,5,3,0,5,0,4,0,5,4,4,3,5,4,4,0,7,4,0,7,5,4,4,0,0,4,0,9,0,0,3,0,4,4,8,4,0,10,4,4,4,4,5,0,0,5,6,4,4,5,5,0,3,5,0,5,4,4,4,0,0,0,0,0,0,0,4,6,5" ring="24">
</div>

You can see that its play is extremely short sighted - its top two moves are both easily refutable, it seems to consider many nonsensical moves, and does not consider what I believe to be a winning combination starting with the move outlined in green.

Later on in training, we can see it play some more ordinary looking games.

<div class="game" position="125,155,141,157,156,126,142,140,170,184,154,171,139,153,128,114,143,112,124,109,138,122,144,145,186,202,158,98,84,130,173,82,113" movable>
</div>

And in this position, it is able to spot a combination that wins the game.

<div class="game" position="125,155,141,157,156,126,142,140,170,184,154,171,139,153,128,114,143,112,124,109,138,122" heatmap="0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,42,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,722,0,0,0,0,0,0,0,2,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,23,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0" ring="144" skip-existing>
</div>

You can see how it diverts nearly all of its time into thinking about moving to the winning move, despite the win being relatively distant.

In fact, we can revisit the previous position and ask the AI what it thinks now.

<div class="game" position="25,185,174,81,43,10,69,68,39,8,142,17,99,136,207,145,184,180,161,199,6,200,154,102,217,216,58,192,23,28,53,5,171,187,115,133,47,48,220,159,33,163,149,63,14,182,141,51,218,60,148,215,221,219,210,179,54,84" heatmap="0,0,0,0,0,0,0,92,0,0,0,0,0,0,0,0,0,859,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,26,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0" ring="24" skip-existing>
</div>

Indeed, it correctly finds the winning move.

More impressively, it is able to this almost instantly. In fact, here is the *policy net's* output:

<div class="game" position="25,185,174,81,43,10,69,68,39,8,142,17,99,136,207,145,184,180,161,199,6,200,154,102,217,216,58,192,23,28,53,5,171,187,115,133,47,48,220,159,33,163,149,63,14,182,141,51,218,60,148,215,221,219,210,179,54,84" heatmap="0.000484,0.000614,0.000588,0.000517,0.000482,0.002150,0.001699,0.080366,0.000722,0.000834,0.000659,0.000576,0.000343,0.000368,0.000624,0.000879,0.001205,0.208558,0.008410,0.001317,0.000414,0.000730,0.000699,0.000439,0.000107,0.000250,0.003172,0.000391,0.002021,0.001065,0.001560,0.000794,0.000527,0.000639,0.000424,0.000096,0.000034,0.001146,0.195774,0.002016,0.001478,0.000451,0.001407,0.000602,0.000121,0.000137,0.000345,0.001486,0.001726,0.001663,0.000648,0.000701,0.000477,0.000409,0.000655,0.000280,0.000169,0.000405,0.000092,0.000436,0.000707,0.014320,0.000579,0.000294,0.001308,0.000487,0.000593,0.000427,0.000183,0.000090,0.000250,0.000102,0.000700,0.000129,0.000293,0.000320,0.001188,0.000391,0.000478,0.000552,0.000266,0.000334,0.000131,0.000106,0.000123,0.000159,0.000302,0.000688,0.000559,0.001479,0.000261,0.000994,0.000268,0.000471,0.000396,0.000284,0.000155,0.000303,0.000405,0.007425,0.000174,0.000261,0.000166,0.001807,0.026645,0.000548,0.000737,0.000472,0.001749,0.000387,0.002205,0.002183,0.001465,0.000504,0.002161,0.029111,0.000423,0.000855,0.000344,0.000184,0.001657,0.002191,0.000457,0.000401,0.001682,0.001992,0.000715,0.000465,0.000508,0.000294,0.000490,0.000641,0.035992,0.000786,0.225774,0.000393,0.001484,0.000092,0.000891,0.000936,0.000452,0.000533,0.000601,0.004320,0.002525,0.001294,0.000460,0.000550,0.000592,0.001147,0.000840,0.001109,0.021024,0.000293,0.000486,0.000383,0.000368,0.002050,0.000544,0.000530,0.000598,0.000406,0.000865,0.001284,0.000787,0.000565,0.000463" ring="24" skip-existing>
</div>

Without *any* calculation, the neural network by some magical "intuition" just *knows* where it should put its pieces.

Well now it's time to have some fun right?

Let's ask the policy what the best response to the typical first move is.

<div class="game" position="112" heatmap="0.002484,0.002375,0.002468,0.002561,0.002515,0.002516,0.002466,0.002143,0.002327,0.002261,0.002206,0.002250,0.002489,0.002367,0.002202,0.002413,0.002479,0.002324,0.002218,0.002056,0.002470,0.002296,0.002190,0.001949,0.002841,0.001694,0.002146,0.002570,0.002633,0.002344,0.002516,0.002351,0.002361,0.002019,0.003955,0.002045,0.002682,0.002754,0.002825,0.002944,0.003899,0.002190,0.002534,0.002418,0.002704,0.002380,0.002252,0.002141,0.002100,0.002515,0.003961,0.003053,0.002084,0.002492,0.003127,0.002352,0.002416,0.001880,0.002074,0.002198,0.002392,0.002463,0.003303,0.002122,0.003264,0.002636,0.002698,0.013949,0.002783,0.002534,0.003485,0.003060,0.004323,0.002341,0.002328,0.002232,0.002569,0.002081,0.003075,0.002314,0.001105,0.017811,0.051394,0.015244,0.000971,0.001413,0.003601,0.002550,0.003064,0.002375,0.002683,0.002052,0.002177,0.002339,0.002292,0.017112,0.005221,0.021598,0.005322,0.013773,0.002151,0.003012,0.002499,0.002701,0.002363,0.002269,0.002234,0.001897,0.001761,0.016161,0.057036,0.014207,0.026391,0.063439,0.013988,0.002774,0.002159,0.002485,0.002048,0.002594,0.001754,0.002363,0.001866,0.002123,0.020271,0.005408,0.016959,0.005804,0.020991,0.002298,0.002513,0.002464,0.002539,0.002639,0.002246,0.002016,0.002053,0.002511,0.002233,0.000919,0.016684,0.052368,0.011245,0.000833,0.002181,0.002628,0.001964,0.002699,0.002624,0.002222,0.001789,0.003040,0.001899,0.001923,0.002468,0.002381,0.018866,0.002468,0.002951,0.002602,0.003507,0.003186,0.002228,0.002466,0.002280,0.002051,0.002046,0.002246,0.001879,0.002635,0.001629,0.001682,0.002429,0.002595,0.002842,0.002286,0.002412,0.002291,0.002672,0.002525,0.002630,0.002482,0.001932,0.003319,0.002568,0.002006,0.001895,0.001854,0.001752,0.002968,0.002004,0.002266,0.002592,0.002438,0.002364,0.002313,0.002305,0.002166,0.001962,0.002285,0.002125,0.002246,0.001812,0.002543,0.001618,0.002134,0.002286,0.002768,0.002472,0.002346,0.002377,0.002560,0.002631,0.002293,0.002260,0.002576,0.001888,0.002349,0.002577,0.002413,0.002568,0.002463,0.002469,0.002477" skip-existing>
</div>

I personally like to move immediately diagonal for my first move because that's what you do in tic-tac-toe but maybe I will need to change my ways now.

Maybe I should play some games against it. (I'm playing black in all the games).

<div class="game" position="112,142,126,140,143,125,110,141,111,109,157,93,77,139,138,124,94,154,169,156,172,78,108,128,170,114,100,171,95,127,80,66,155,186,201,168,185,153,200,215,202,167,181,199,151,183,136,122,166,196,121" movable>
</div>

Looks like I'm just too good.

<div class="game" position="112,114,128,144,129,127,143,113,99,115,158,116,117,130,102,146,162,100,145,131,161,86,101,85,70,82,98,84,83,68,132,52" movable>
</div>

Nevermind, though this is also a pretty fun game to play: You are versing me, white to play. Can you find the winning tactic in this position?

<div class="game" position="112,114,128,144,129,127,143,113,99,115,158,116,117,130,102,146,162,100,145,131,161">
</div>

Hint: this is the policy net's output:

<div class="game" position="112,114,128,144,129,127,143,113,99,115,158,116,117,130,102,146,162,100,145,131,161" heatmap="0.000230,0.000280,0.000234,0.000202,0.000232,0.000173,0.000213,0.000226,0.000212,0.000265,0.000310,0.000213,0.000209,0.000251,0.000247,0.000201,0.000278,0.000320,0.000161,0.000239,0.000354,0.000256,0.000183,0.000495,0.000295,0.000215,0.000296,0.000292,0.000311,0.000229,0.000226,0.000211,0.000154,0.000139,0.000420,0.000190,0.000192,0.000346,0.000138,0.000515,0.000401,0.000224,0.000218,0.000275,0.000218,0.000229,0.000232,0.000215,0.000211,0.000280,0.000177,0.000249,0.000227,0.000549,0.000324,0.000708,0.000866,0.000422,0.000259,0.000210,0.000295,0.000216,0.000196,0.000312,0.000206,0.000675,0.000270,0.000405,0.001613,0.001003,0.002062,0.000360,0.000733,0.000303,0.000279,0.000216,0.000234,0.000307,0.000157,0.000238,0.000411,0.000356,0.010081,0.000648,0.020950,0.261326,0.340138,0.001678,0.000349,0.000231,0.000273,0.000268,0.000132,0.000166,0.000443,0.000334,0.000407,0.000542,0.142159,0.012216,0.000591,0.000162,0.000179,0.000246,0.000194,0.000133,0.000497,0.000238,0.000319,0.000377,0.000390,0.000265,0.000234,0.000289,0.000142,0.000336,0.000337,0.000296,0.128754,0.000583,0.000195,0.000215,0.000158,0.000336,0.000157,0.000309,0.000208,0.001369,0.000223,0.006216,0.001037,0.000226,0.000231,0.000262,0.000201,0.000206,0.000125,0.000237,0.000301,0.001050,0.000700,0.004475,0.000397,0.000332,0.000265,0.000282,0.000205,0.000173,0.000187,0.000208,0.000121,0.000123,0.001010,0.000264,0.000200,0.000387,0.002230,0.000313,0.000318,0.000216,0.000208,0.000281,0.000204,0.000226,0.000126,0.000194,0.000120,0.000209,0.000077,0.000242,0.000372,0.000162,0.000326,0.000254,0.000222,0.000199,0.000292,0.000294,0.000206,0.000338,0.000141,0.000226,0.000183,0.000220,0.000144,0.000220,0.000333,0.000220,0.000228,0.000235,0.000209,0.000222,0.000229,0.000240,0.000270,0.000245,0.000241,0.000240,0.000258,0.000305,0.000223,0.000223,0.000235,0.000246" skip-existing>
</div>

And if we get it to search the position...
```
info nodes 50 value 0.287770 pv L10 L9 K10 K11 J10 M7 M6
info nodes 100 value 0.395997 pv L10 L9 K10 K11 J10 M7 M6 I4 I3
info nodes 150 value 0.437160 pv L10 L9 K10 K11 J10 M7 M6 I4 I3 M4
info nodes 200 value 0.494264 pv L10 L9 K10 K11 J10 M7 M6 I4 I3 M10
info nodes 700 value 0.677791 pv K10 K11 L10 L9 J10 M7 M6 I4 I3 M10
info nodes 750 value 0.648769 pv K10 K11 L10 L9 J10 M7 M6 I4 I3 M4 N3
info nodes 800 value 0.636061 pv K10 K11 L10 L9 J10 M7 M6 I4 I3 M4 N3 J5
info nodes 900 value 0.629300 pv K10 K11 L10 L9 J10 M7 M6 I4 I3 M4 N3 J5 K5
info nodes 1600 value 0.622272 pv L10 L9 K10 K11 J10 M7 M6 I4 I3 M4 N3 J5 K5
info nodes 1850 value 0.599837 pv L10 L9 K10 K11 J10 M7 M6 I4 I3 M4 N3 J5 K5 H3 G2
info nodes 5650 value 0.538424 pv L10 L9 K10 K11 J10 M7 M6 I4 I3 M4 N3 J5 K5 H3 G2 J4
info nodes 6400 value 0.526216 pv L10 L9 K10 K11 J10 M7 M6 I4 I3 J5 K5 H3 G2 M10 M11
info nodes 8000 value 0.634462 pv L10 L9 K10 K11 H10 I9 J10 I10 I11 M7 H12
info nodes 20000 value 0.903950 pv L10 L9 K10 K11 H10 I9 J10 I10 I11 M7 H12
bestmove L10
```

And actually, I think all of the circled moves win.

<div class="game" position="112,114,128,144,129,127,143,113,99,115,158,116,117,130,102,146,162,100,145,131,161" heatmap="0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,4,907,988,0,0,0,0,0,0,0,0,0,0,0,58,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0" ring="86,85,82" skip-existing>
</div>

There might be more wins, though they probably take longer. After you play those moves in any order, and black tries to defend their immediate threats, the killshot is obvious even to the policy net, which reports that the circled move has a $96.7\%$ chance to be optimal.

<div class="game" position="112,114,128,144,129,127,143,113,99,115,158,116,117,130,102,146,162,100,145,131,161,86,101,85,70,82,98" heatmap="0.000056,0.000055,0.000059,0.000061,0.000052,0.000058,0.000059,0.000052,0.000055,0.000071,0.000061,0.000051,0.000045,0.000056,0.000117,0.000055,0.000076,0.000070,0.000065,0.000041,0.000108,0.000065,0.000088,0.000107,0.000030,0.000069,0.000053,0.000060,0.000063,0.000059,0.000057,0.000072,0.000082,0.000054,0.000076,0.000067,0.000064,0.000127,0.000056,0.000135,0.000059,0.000103,0.000033,0.000132,0.000045,0.000052,0.000057,0.000073,0.000083,0.000095,0.000119,0.000168,0.000067,0.000245,0.000043,0.000269,0.000368,0.000076,0.000199,0.000058,0.000083,0.000053,0.000101,0.000135,0.000117,0.000215,0.000224,0.000102,0.000474,0.000181,0.000134,0.009105,0.000102,0.000059,0.000063,0.000083,0.000075,0.000099,0.000084,0.000103,0.000114,0.000897,0.967101,0.000212,0.000099,0.000097,0.000053,0.000063,0.000047,0.000070,0.000101,0.000116,0.000162,0.000164,0.000074,0.000049,0.000054,0.000059,0.000060,0.000063,0.000247,0.000091,0.000078,0.000060,0.000070,0.000063,0.000088,0.000068,0.000058,0.000130,0.000087,0.001160,0.002441,0.000135,0.000060,0.000059,0.000034,0.000081,0.000065,0.000083,0.000069,0.000167,0.000063,0.001064,0.000084,0.000072,0.000068,0.000090,0.000049,0.000058,0.000037,0.000034,0.000080,0.000159,0.000110,0.000339,0.000080,0.000079,0.000061,0.000059,0.000058,0.000043,0.000061,0.000044,0.000031,0.000038,0.000112,0.000080,0.000036,0.000061,0.000564,0.000107,0.000055,0.000055,0.000051,0.000043,0.000048,0.000088,0.000043,0.000050,0.000052,0.000062,0.000025,0.000060,0.000074,0.000044,0.000070,0.000069,0.000052,0.000045,0.000058,0.000066,0.000062,0.000088,0.000046,0.000070,0.000059,0.000060,0.000043,0.000062,0.000067,0.000052,0.000049,0.000060,0.000051,0.000052,0.000057,0.000074,0.000057,0.000053,0.000053,0.000061,0.000069,0.000060,0.000053,0.000050,0.000058,0.000057" ring="84" skip-existing>
</div>

## The results

### Training statistics

![Policy accuracy](/static/fiveinarow/policy_acc.png)  
The policy net is able to predict the best move out of a sea of hundreds of moves with a 70% accuracy.

![Value loss](/static/fiveinarow/value_loss.png)  
The value net provides a somewhat noisier estimate of the position's expected outcome, but its evaluations are still critical for guiding search.

### Household internal rankings

| Rank | Player |
| ---- | ------ |
| 1 | Me |
| 2 | AI |
| 3 | The little bastard |
| 4 | Mum |
| 5 | Granny |
| 6 | Dad |

## Afterword

This isn't my first rodeo into making computers teach themselves simple games - I've done it before with [Connect-4](https://github.com/puct9/c4ai) (don't judge my code there - it's very old) and Othello too. Likewise, I doubt it would be my last, as doing a project like this always teaches me plenty of stuff about machine learning, machine learning frameworks, and whatever language I'm using such as C++. In the future, I would like to open source this project, but not before I improve the quality of the code so that I'm happy with it.

Perhaps unsurprisingly, there's plenty of projects like this one on the internet with some of them backed by large communities. My favourite are:

- [Leela Chess Zero](https://lczero.org/) / [Leela Zero](https://zero.sjeng.org/)
- [KataGo](https://github.com/lightvector/KataGo)

There's also a [nice read](https://github.com/lightvector/KataGo/blob/master/docs/KataGoMethods.md#training-on-multiple-board-sizes-via-masking) in KataGo's docs where they describe how to train a single neural network to handle arbitrarily sized inputs (so it can play on both 15x15 and 19x19 boards), which I might try to do with this game one day.

<script src="/static/fiveinarow/game.js">
</script>
