import { Noise } from 'noisejs';
import OctaveNoise from './OctaveNoise';

const seed = Math.random();
const noise = new Noise(seed);
const octaveNoise = new OctaveNoise(seed);

test('calculates a single octave of 2D noise', () => {
  const expected = noise.simplex2(1, 1);
  const result = octaveNoise.simplex2(1, 1);
  expect(result).toBe(expected);
});

test('calculates multiple octaves of 2D noise', () => {
  const oct1 = noise.simplex2(1, 1);
  const oct2 = noise.simplex2(2, 2) * 0.5;
  const expected = (oct1 + oct2) / 1.5;
  const result = octaveNoise.simplex2(1, 1, 2, 0.5);
  expect(result).toBe(expected);
});

test('calculates a single octave of 3D noise', () => {
  const expected = noise.simplex3(1, 1, 1);
  const result = octaveNoise.simplex3(1, 1, 1);
  expect(result).toBe(expected);
});

test('calculates multiple octaves of 3D noise', () => {
  const oct1 = noise.simplex3(1, 1, 1);
  const oct2 = noise.simplex3(2, 2, 2) * 0.5;
  const expected = (oct1 + oct2) / 1.5;
  const result = octaveNoise.simplex3(1, 1, 1, 2, 0.5);
  expect(result).toBe(expected);
});
