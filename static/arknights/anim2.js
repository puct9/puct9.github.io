(async function () {
  var img_id = "_anim_imgfba2b2d9e0a54d7f837fcdb1ba9842b2";
  var slider_id = "_anim_sliderfba2b2d9e0a54d7f837fcdb1ba9842b2";
  var loop_select_id = "_anim_loop_selectfba2b2d9e0a54d7f837fcdb1ba9842b2";
  var frames = new Array(29);

  var offsets = [0,
    54392,
    108472,
    162520,
    216503,
    270545,
    324569,
    378529,
    432239,
    486649,
    540721,
    594708,
    648347,
    701967,
    755534,
    809082,
    862591,
    915842,
    969432,
    1022707,
    1076069,
    1128927,
    1181592,
    1234245,
    1286997,
    1339752,
    1392484,
    1445166,
    1497476,
    1550014];

  const response = await fetch("/static/arknights/combined2.dat");
  const data = new Uint8Array(await response.arrayBuffer());
  console.log(data.length);
  for (let i = 0; i < offsets.length - 1; i++) {
    const chunk = data.subarray(offsets[i], offsets[i + 1]);
    console.log(offsets[i + 1] - offsets[i])
    console.log(chunk.length)

    let binary = "";
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }

    frames[i] = "data:image/png;base64," + btoa(binary);
  }

  /* set a timeout to make sure all the above elements are created before
     the object is initialized. */
  setTimeout(function () {
    animfba2b2d9e0a54d7f837fcdb1ba9842b2 = new Animation(frames, img_id, slider_id, 200.0,
      loop_select_id);
  }, 0);
})()
