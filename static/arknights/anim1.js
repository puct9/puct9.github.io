(async function () {
  var img_id = "_anim_imge78e2ad2243f4b548e517b9957d87124";
  var slider_id = "_anim_slidere78e2ad2243f4b548e517b9957d87124";
  var loop_select_id = "_anim_loop_selecte78e2ad2243f4b548e517b9957d87124";
  var frames = new Array(123);

  var offsets = [0,
    56489,
    112960,
    169379,
    225809,
    282214,
    338601,
    394994,
    451359,
    507281,
    563187,
    619010,
    675268,
    731120,
    787020,
    842931,
    898792,
    954658,
    1010503,
    1066400,
    1122147,
    1177853,
    1233568,
    1289257,
    1344968,
    1400663,
    1456338,
    1511876,
    1567387,
    1622875,
    1678148,
    1733628,
    1789069,
    1844563,
    1900050,
    1955516,
    2011248,
    2066965,
    2122862,
    2178750,
    2234244,
    2289607,
    2345488,
    2401373,
    2457280,
    2513174,
    2569045,
    2624892,
    2680720,
    2736555,
    2792380,
    2848049,
    2903650,
    2959037,
    3014414,
    3069913,
    3125354,
    3180772,
    3236175,
    3291372,
    3346582,
    3401773,
    3456940,
    3512210,
    3567457,
    3622692,
    3677872,
    3732888,
    3787647,
    3842402,
    3897157,
    3952048,
    4006895,
    4061795,
    4116530,
    4171627,
    4226698,
    4281571,
    4336436,
    4391333,
    4446231,
    4501085,
    4555954,
    4610605,
    4665220,
    4719830,
    4774359,
    4828807,
    4883044,
    4937252,
    4991710,
    5045915,
    5099681,
    5153446,
    5207102,
    5260724,
    5314300,
    5367948,
    5422083,
    5476142,
    5530551,
    5585477,
    5640013,
    5694531,
    5748963,
    5803394,
    5857908,
    5912421,
    5966823,
    6021325,
    6075807,
    6130304,
    6184755,
    6239187,
    6293554,
    6347979,
    6402685,
    6456363,
    6510030,
    6563606,
    6617180,
    6670577,
    6723511,
    6776447];

  const response = await fetch("/static/arknights/combined1.dat");
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
    anime78e2ad2243f4b548e517b9957d87124 = new Animation(frames, img_id, slider_id, 200.0,
      loop_select_id);
  }, 0);
})()
