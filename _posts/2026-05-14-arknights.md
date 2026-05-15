---
layout: post
title: "Arknights Endfield SAT Place and Route"
date: 2026-05-14 01:00:00 +1000
categories: arknights endfield sat place and route pnr
---
# Arknights Endfield SAT Place and Route

Technologies:

- Minizinc
- OR-Tools CP-SAT (Python)
- Matplotlib

Code: [https://github.com/puct9/endfield-placement](https://github.com/puct9/endfield-placement)

## About the game

[Arknights Endfield](https://endfield.gryphline.com/en-us) is a [gacha game](https://en.wikipedia.org/wiki/Gacha_game) released not so long ago and features all the usual cute looking characters and loot box mechanics you would expect. However, it's unique in also having a factory building element! I've since stopped playing because I found myself being stretched needing to simultaneously feed my [Genshin Impact](https://genshin.hoyoverse.com/en/) addiction, but the puzzle of figuring out how to lay out your factory in a space efficient manner was something I wasn't going to let go as quickly.

<figure class="image">
  <img src="/static/arknights/factory.jpg" alt="Factory">
  <figcaption>My factory in Arknights Endfield</figcaption>
</figure>

### Placement rules

The way factory building works in the various regions in the game vary slightly, but they follow similar rules. The important rules which affect how factory elements are allowed to be placed are that

- Factory buildings cannot overlap with each other or with conveyor belts
- Conveyor belts can overlap with other conveyor belts only when they are travelling in perpendicular directions

## Modelling approach

Prior to this experiment, I had no knowledge of anything to do with place and route (PnR). Apparently, people in the _real world_ tend to use simulated annealing and now reinforcement learning. Being naive, I opted to use constraint programming as the means to an end for this optimisation problem.

That said, there are still more important decisions to be made on _how_ the constraints are expressed to the solver. Being able to create an effective model in constraint programming can mean the difference between finding a solution quickly and finding no solution in days. The use of _global constraints_ often facilitates effective constraint modelling in such scenarios. There is a fairly extensive catalogue of global constraints which vary by solver, some of the common ones include

- _All different_, assert that all of the provided values are unique
- _No overlap 2d_, given an array of values _(x, y, width, height)_, interpret them as rectangles and assert that they do not overlap
- _Network flow_, given a graph $G(V, E)$, solve for the network flow that satisfies a net flow for each vertex $v$, subject to capacities for each edge $e$

You get the idea.

I ended up exploring two fairly orthogonal approaches.

1. Treat conveyors as a stuck-together rectangles and primarily use _No overlap 2d_ to enforce no collisions between factory buildings and conveyors. This approach worked better.
2. Treat conveyors as edges in a graph and primarily use _Network flow_ to solve for a flavour of the [multi-commodity flow problem](https://en.wikipedia.org/wiki/Multi-commodity_flow_problem). This approach worked terribly.

Going with the first option, we need to make a make a minor concession which is to assume a maximum number of turns a conveyor can take. If we do not cap this number (or let it be very large), then we end up with a large number of rectangles that we need to model, which increases the model complexity and makes it hard to solve. Here, we cap it to 3 segments (2 turns).

Due to practical reasons in the game, we want to have a fixed size in the $Y$ axis we want avoid exceeding, so we are primarily optimising to minimise the width of the design. While it may be alluring to set the solver objective as the maximum $X$ coordinate of any factory element, a related proxy objective of the sum of all conveyor lengths proved to be a far more effective constraint. This was unintuitive, but I believe the reason to be that the latter constraint facilitated more aggressive pruning of the search. In some sense, the former objective is also more _sparse_, so there is less "signal" from the objective being propagated to the variables that the solver is trying to make decisions on, leading to less efficient search.

## Results

### _HC Valley Battery_[^1]

[^1]: In the floor plans, the electric pylons were omitted to help simplify the model. Shuffling buildings around and fitting them back in likely costs little to no extra space.

The HC Valley Battery is an item that can be created using factories. In my experimentation, it was the largest design that the solver was willing to produce a solution for. Smaller designs were largely trivial.

However, despite thousands of CPU hours and tens of dollars in compute credits being spent, there was no definitive optimal design that was generated, though that's not to say we didn't get some very space efficient designs in the end.

Efforts were also made to simplify the model to improve solvability. Such efforts included assuming that the first column of factory buildings would only be in that position (i.e., the 10 buildings on the left can only permute amongst themselves and not move off that column).

<link rel="stylesheet"
href="https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css">

<style>
.animation {
    display: inline-block;
    text-align: center;
}
input[type=range].anim-slider {
    width: 374px;
    margin-left: auto;
    margin-right: auto;
}
.anim-buttons {
    margin: 8px 0px;
}
.anim-buttons button {
    padding: 0;
    width: 36px;
}
.anim-state label {
    margin-right: 8px;
}
.anim-state input {
    margin: 0;
    vertical-align: middle;
}
</style>

<div class="animation">
  <img id="_anim_imge78e2ad2243f4b548e517b9957d87124">
  <div class="anim-controls">
    <input id="_anim_slidere78e2ad2243f4b548e517b9957d87124" type="range" class="anim-slider"
           name="points" min="0" max="1" step="1" value="0"
           oninput="anime78e2ad2243f4b548e517b9957d87124.set_frame(parseInt(this.value));">
    <div class="anim-buttons">
      <button title="Decrease speed" aria-label="Decrease speed" onclick="anime78e2ad2243f4b548e517b9957d87124.slower()">
          <i class="fa fa-minus"></i></button>
      <button title="First frame" aria-label="First frame" onclick="anime78e2ad2243f4b548e517b9957d87124.first_frame()">
        <i class="fa fa-fast-backward"></i></button>
      <button title="Previous frame" aria-label="Previous frame" onclick="anime78e2ad2243f4b548e517b9957d87124.previous_frame()">
          <i class="fa fa-step-backward"></i></button>
      <button title="Play backwards" aria-label="Play backwards" onclick="anime78e2ad2243f4b548e517b9957d87124.reverse_animation()">
          <i class="fa fa-play fa-flip-horizontal"></i></button>
      <button title="Pause" aria-label="Pause" onclick="anime78e2ad2243f4b548e517b9957d87124.pause_animation()">
          <i class="fa fa-pause"></i></button>
      <button title="Play" aria-label="Play" onclick="anime78e2ad2243f4b548e517b9957d87124.play_animation()">
          <i class="fa fa-play"></i></button>
      <button title="Next frame" aria-label="Next frame" onclick="anime78e2ad2243f4b548e517b9957d87124.next_frame()">
          <i class="fa fa-step-forward"></i></button>
      <button title="Last frame" aria-label="Last frame" onclick="anime78e2ad2243f4b548e517b9957d87124.last_frame()">
          <i class="fa fa-fast-forward"></i></button>
      <button title="Increase speed" aria-label="Increase speed" onclick="anime78e2ad2243f4b548e517b9957d87124.faster()">
          <i class="fa fa-plus"></i></button>
    </div>
    <form title="Repetition mode" aria-label="Repetition mode" action="#n" name="_anim_loop_selecte78e2ad2243f4b548e517b9957d87124"
          class="anim-state">
      <input type="radio" name="state" value="once" id="_anim_radio1_e78e2ad2243f4b548e517b9957d87124"
             >
      <label for="_anim_radio1_e78e2ad2243f4b548e517b9957d87124">Once</label>
      <input type="radio" name="state" value="loop" id="_anim_radio2_e78e2ad2243f4b548e517b9957d87124"
             checked>
      <label for="_anim_radio2_e78e2ad2243f4b548e517b9957d87124">Loop</label>
      <input type="radio" name="state" value="reflect" id="_anim_radio3_e78e2ad2243f4b548e517b9957d87124"
             >
      <label for="_anim_radio3_e78e2ad2243f4b548e517b9957d87124">Reflect</label>
    </form>
  </div>
</div>

<script src="/static/arknights/anim.js"></script>
<script src="/static/arknights/anim1.js"></script>

In this example, we can see that the objective to minimise the length of the conveyors could possibly be doing us a disservice when it comes to minimising floor space. Adjusting the model to be more stringent on the dimensions in the first place, we manage to push the dimensions of the design down even further.

<div class="animation">
  <img id="_anim_imgfba2b2d9e0a54d7f837fcdb1ba9842b2">
  <div class="anim-controls">
    <input id="_anim_sliderfba2b2d9e0a54d7f837fcdb1ba9842b2" type="range" class="anim-slider"
           name="points" min="0" max="1" step="1" value="0"
           oninput="animfba2b2d9e0a54d7f837fcdb1ba9842b2.set_frame(parseInt(this.value));">
    <div class="anim-buttons">
      <button title="Decrease speed" aria-label="Decrease speed" onclick="animfba2b2d9e0a54d7f837fcdb1ba9842b2.slower()">
          <i class="fa fa-minus"></i></button>
      <button title="First frame" aria-label="First frame" onclick="animfba2b2d9e0a54d7f837fcdb1ba9842b2.first_frame()">
        <i class="fa fa-fast-backward"></i></button>
      <button title="Previous frame" aria-label="Previous frame" onclick="animfba2b2d9e0a54d7f837fcdb1ba9842b2.previous_frame()">
          <i class="fa fa-step-backward"></i></button>
      <button title="Play backwards" aria-label="Play backwards" onclick="animfba2b2d9e0a54d7f837fcdb1ba9842b2.reverse_animation()">
          <i class="fa fa-play fa-flip-horizontal"></i></button>
      <button title="Pause" aria-label="Pause" onclick="animfba2b2d9e0a54d7f837fcdb1ba9842b2.pause_animation()">
          <i class="fa fa-pause"></i></button>
      <button title="Play" aria-label="Play" onclick="animfba2b2d9e0a54d7f837fcdb1ba9842b2.play_animation()">
          <i class="fa fa-play"></i></button>
      <button title="Next frame" aria-label="Next frame" onclick="animfba2b2d9e0a54d7f837fcdb1ba9842b2.next_frame()">
          <i class="fa fa-step-forward"></i></button>
      <button title="Last frame" aria-label="Last frame" onclick="animfba2b2d9e0a54d7f837fcdb1ba9842b2.last_frame()">
          <i class="fa fa-fast-forward"></i></button>
      <button title="Increase speed" aria-label="Increase speed" onclick="animfba2b2d9e0a54d7f837fcdb1ba9842b2.faster()">
          <i class="fa fa-plus"></i></button>
    </div>
    <form title="Repetition mode" aria-label="Repetition mode" action="#n" name="_anim_loop_selectfba2b2d9e0a54d7f837fcdb1ba9842b2"
          class="anim-state">
      <input type="radio" name="state" value="once" id="_anim_radio1_fba2b2d9e0a54d7f837fcdb1ba9842b2"
             >
      <label for="_anim_radio1_fba2b2d9e0a54d7f837fcdb1ba9842b2">Once</label>
      <input type="radio" name="state" value="loop" id="_anim_radio2_fba2b2d9e0a54d7f837fcdb1ba9842b2"
             checked>
      <label for="_anim_radio2_fba2b2d9e0a54d7f837fcdb1ba9842b2">Loop</label>
      <input type="radio" name="state" value="reflect" id="_anim_radio3_fba2b2d9e0a54d7f837fcdb1ba9842b2"
             >
      <label for="_anim_radio3_fba2b2d9e0a54d7f837fcdb1ba9842b2">Reflect</label>
    </form>
  </div>
</div>

<script src="/static/arknights/anim2.js"></script>
