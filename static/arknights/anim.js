function isInternetExplorer() {
  ua = navigator.userAgent;
  /* MSIE used to detect old browsers and Trident used to newer ones*/
  return ua.indexOf("MSIE ") > -1 || ua.indexOf("Trident/") > -1;
}

/* Define the Animation class */
class Animation {
  constructor(frames, img_id, slider_id, interval, loop_select_id) {
    this.img_id = img_id;
    this.slider_id = slider_id;
    this.loop_select_id = loop_select_id;
    this.interval = interval;
    this.current_frame = 0;
    this.direction = 0;
    this.timer = null;
    this.frames = new Array(frames.length);

    for (var i = 0; i < frames.length; i++) {
      this.frames[i] = new Image();
      this.frames[i].src = frames[i];
    }
    var slider = document.getElementById(this.slider_id);
    slider.max = this.frames.length - 1;
    if (isInternetExplorer()) {
      // switch from oninput to onchange because IE <= 11 does not conform
      // with W3C specification. It ignores oninput and onchange behaves
      // like oninput. In contrast, Microsoft Edge behaves correctly.
      slider.setAttribute('onchange', slider.getAttribute('oninput'));
      slider.setAttribute('oninput', null);
    }
    this.set_frame(this.current_frame);
  }
  get_loop_state() {
    var button_group = document[this.loop_select_id].state;
    for (var i = 0; i < button_group.length; i++) {
      var button = button_group[i];
      if (button.checked) {
        return button.value;
      }
    }
    return undefined;
  }
  set_frame(frame) {
    this.current_frame = frame;
    document.getElementById(this.img_id).src =
      this.frames[this.current_frame].src;
    document.getElementById(this.slider_id).value = this.current_frame;
  }
  next_frame() {
    this.set_frame(Math.min(this.frames.length - 1, this.current_frame + 1));
  }
  previous_frame() {
    this.set_frame(Math.max(0, this.current_frame - 1));
  }
  first_frame() {
    this.set_frame(0);
  }
  last_frame() {
    this.set_frame(this.frames.length - 1);
  }
  slower() {
    this.interval /= 0.7;
    if (this.direction > 0) { this.play_animation(); }
    else if (this.direction < 0) { this.reverse_animation(); }
  }
  faster() {
    this.interval *= 0.7;
    if (this.direction > 0) { this.play_animation(); }
    else if (this.direction < 0) { this.reverse_animation(); }
  }
  anim_step_forward() {
    this.current_frame += 1;
    if (this.current_frame < this.frames.length) {
      this.set_frame(this.current_frame);
    } else {
      var loop_state = this.get_loop_state();
      if (loop_state == "loop") {
        this.first_frame();
      } else if (loop_state == "reflect") {
        this.last_frame();
        this.reverse_animation();
      } else {
        this.pause_animation();
        this.last_frame();
      }
    }
  }
  anim_step_reverse() {
    this.current_frame -= 1;
    if (this.current_frame >= 0) {
      this.set_frame(this.current_frame);
    } else {
      var loop_state = this.get_loop_state();
      if (loop_state == "loop") {
        this.last_frame();
      } else if (loop_state == "reflect") {
        this.first_frame();
        this.play_animation();
      } else {
        this.pause_animation();
        this.first_frame();
      }
    }
  }
  pause_animation() {
    this.direction = 0;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  play_animation() {
    this.pause_animation();
    this.direction = 1;
    var t = this;
    if (!this.timer) this.timer = setInterval(function () {
      t.anim_step_forward();
    }, this.interval);
  }
  reverse_animation = function () {
    this.pause_animation();
    this.direction = -1;
    var t = this;
    if (!this.timer) this.timer = setInterval(function () {
      t.anim_step_reverse();
    }, this.interval);
  }
}