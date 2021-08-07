import { Matrix3 } from 'three';

// Positive X
const px = new Matrix3();
px.set(0,  0,  1,
       0, -1,  0,
      -1,  0,  0);

// Negative X
const nx = new Matrix3();
nx.set(0,  0, -1,
       0, -1,  0,
       1,  0,  0);

// Positive Y
const py = new Matrix3();
py.set(1,  0,  0,
       0,  0,  1,
       0,  1,  0);

// Negative Y
const ny = new Matrix3();
ny.set(1,  0,  0,
       0,  0, -1,
       0, -1,  0);

// Positive Z
const pz = new Matrix3();
pz.set(1,  0,  0,
       0, -1,  0,
       0,  0,  1);

// Negative Z
const nz = new Matrix3();
nz.set(-1,  0,  0,
        0, -1,  0,
        0,  0, -1);

const transforms = [ px, nx, py, ny, pz, nz ];
export default transforms;
