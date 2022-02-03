const seventh = 0.142857142857;
const twoEightyNinth = 1.0 / 289.0;

const C = [1.0 / 6.0, 1.0 / 3.0];
const D = [0.0, 0.5, 1.0, 2.0];
const ns = [
  seventh * D[3] - D[0],
  seventh * D[1] - D[2],
  seventh * D[2] - D[0],
];
const nszSq = ns[2] * ns[2];

function mod289(v) {
  return v.map((el) => el - Math.floor(el * twoEightyNinth) * 289.0);
}
function permute(v) {
  return mod289(
    v.map((el) => ((el * 34.0) + 1.0) * el)
  );
}
function taylorInvSqrt(v) {
  return v.map((el) => 1.79284291400159 - 0.85373472095314 * el);
}
function dot(a, b) {
  return a.reduce((acc, el, ix) => acc + (el * b[ix]), 0);
}
function addScalar(v, s) {
  return v.map((el) => el + s);
}
function addVector(v1, v2) {
  return v1.map((el, ix) => el + v2[ix]);
}
function multScalar(v, s) {
  return v.map((el) => el * s);
}
function step(edge, x, stepValue = 1.0) {
  return edge.map((el, i) => x[i] < el ? 0.0 : stepValue);
}

let first = true;
export function simplex3d(v) {

  // First corner
  const dotv = dot(v, [C[1], C[1], C[1]]);
  const i = [
    Math.floor(v[0] + dotv),
    Math.floor(v[1] + dotv),
    Math.floor(v[2] + dotv),
  ];
  const doti = dot(i, [C[0], C[0], C[0]]);
  const x0 = [
    v[0] - i[0] + doti,
    v[1] - i[1] + doti,
    v[2] - i[2] + doti,
  ];

  // Other corners
  const g = step([x0[1], x0[2], x0[0]], x0);
  const l = [
    1.0 - g[0],
    1.0 - g[1],
    1.0 - g[2]
  ];
  const i1 = [
    Math.min(g[0], l[2]),
    Math.min(g[1], l[0]),
    Math.min(g[2], l[1]),
  ];
  const i2 = [
    Math.max(g[0], l[2]),
    Math.max(g[1], l[0]),
    Math.max(g[2], l[1]),
  ];

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  const x1 = [
    x0[0] - i1[0] + C[0],
    x0[1] - i1[1] + C[0],
    x0[2] - i1[2] + C[0],
  ];
  const x2 = [
    x0[0] - i2[0] + C[1],
    x0[1] - i2[1] + C[1],
    x0[2] - i2[2] + C[1],
  ];
  const x3 = [
    x0[0] - D[1],
    x0[1] - D[1],
    x0[2] - D[1],
  ];

  // Permutations
  const i_ = mod289(i);
  const p = permute(
    addVector(
      permute(
        addVector(
          permute(
            addScalar([0.0, i1[2], i2[2], 1.0], i_[2])
          ),
          addScalar([0.0, i1[1], i2[1], 1.0], i_[1])
        )
      ),
      addScalar([0.0, i1[0], i2[0], 1.0], i_[0])
    )
  );

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  const j = p.map((el) => el - 49.0 * Math.floor(el * nszSq)); //  mod(p,7*7)
  
  const x_ = j.map((el) => Math.floor(el * ns[2]));
  const y_ = j.map((el, ix) => Math.floor(el - 7.0 * x_[ix])); // mod(j,N)

  const x = x_.map((el) => el * ns[0] + ns[1]);
  const y = y_.map((el) => el * ns[0] + ns[1]);
  const h = x.map((el, ix) => 1.0 - Math.abs(el) - Math.abs(y[ix]));

  const b0 = [x[0], x[1], y[0], y[1]];
  const b1 = [x[2], x[3], y[2], y[3]];

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  const s0 = b0.map((el) => Math.floor(el) * 2.0 + 1.0);
  const s1 = b1.map((el) => Math.floor(el) * 2.0 + 1.0);
  const sh = step(h, [0.0, 0.0, 0.0, 0.0], -1.0);

  const a0 = [
    b0[0] + s0[0] * sh[0],
    b0[2] + s0[2] * sh[0],
    b0[1] + s0[1] * sh[1],
    b0[3] + s0[3] * sh[1],
  ];
  const a1 = [
    b1[0] + s1[0] * sh[2],
    b1[2] + s1[2] * sh[2],
    b1[1] + s1[1] * sh[3],
    b1[3] + s1[3] * sh[3],
  ];

  let p0 = [a0[0], a0[1], h[0]];
  let p1 = [a0[2], a0[3], h[1]];
  let p2 = [a1[0], a1[1], h[2]];
  let p3 = [a1[2], a1[3], h[3]];

  //Normalise gradients
  const norm = taylorInvSqrt([
    dot(p0, p0),
    dot(p1, p1),
    dot(p2, p2),
    dot(p3, p3)
  ]);
  p0 = multScalar(p0, norm[0]);
  p1 = multScalar(p1, norm[1]);
  p2 = multScalar(p2, norm[2]);
  p3 = multScalar(p3, norm[3]);

  // Mix final noise value
  const m = [
    Math.max(0.6 - dot(x0, x0), 0.0),
    Math.max(0.6 - dot(x1, x1), 0.0),
    Math.max(0.6 - dot(x2, x2), 0.0),
    Math.max(0.6 - dot(x3, x3), 0.0),
  ].map((x) => x * x * x * x);

  return 42.0 * dot(m, [
    dot(p0, x0),
    dot(p1, x1),
    dot(p2, x2),
    dot(p3, x3),
  ]);
}

let min = null; let max = null;
setInterval(() => {
  if (min !== null)
  console.log({ min, max })
}, 2500);

export function simplex3dOctaves(x, y, z, octaves = 1, persistence = 0.5, normalize = false) {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    const noise = simplex3d([x * frequency, y * frequency, z * frequency]);
    if (min === null || noise < min) min = noise;
    if (max === null || noise > max) max = noise;
    total += noise * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }

  if (normalize) {
    return 0.5 * total / maxValue + 0.5;
  }
  return total / maxValue;
}