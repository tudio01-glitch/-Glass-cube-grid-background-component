import type { Heightmap } from '../component/glass/tokens';

/**
 * Turns a 3D model file (.obj / .stl) into a normalized heightmap the weave
 * can sample: vertices are projected onto their widest plane, the remaining
 * axis becomes height, gaps are filled and the field is smoothed.
 */

const GRID = 48;

function parseObjVertices(text: string): number[] {
  const verts: number[] = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('v ') && !line.startsWith('v\t')) continue;
    const parts = line.slice(2).trim().split(/\s+/);
    if (parts.length < 3) continue;
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const z = Number(parts[2]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) verts.push(x, y, z);
  }
  return verts;
}

function parseStlVertices(buffer: ArrayBuffer): number[] {
  const bytes = new Uint8Array(buffer);
  const head = new TextDecoder().decode(bytes.subarray(0, 512));
  if (head.trimStart().toLowerCase().startsWith('solid') && head.includes('vertex')) {
    const text = new TextDecoder().decode(bytes);
    const verts: number[] = [];
    const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      verts.push(Number(m[1]), Number(m[2]), Number(m[3]));
    }
    return verts;
  }
  // binary STL: 80-byte header, uint32 triangle count, 50 bytes per triangle
  if (buffer.byteLength < 84) return [];
  const view = new DataView(buffer);
  const count = view.getUint32(80, true);
  const verts: number[] = [];
  for (let i = 0; i < count; i++) {
    const base = 84 + i * 50;
    if (base + 48 > buffer.byteLength) break;
    for (let v = 0; v < 3; v++) {
      const off = base + 12 + v * 12; // skip the normal
      verts.push(
        view.getFloat32(off, true),
        view.getFloat32(off + 4, true),
        view.getFloat32(off + 8, true),
      );
    }
  }
  return verts;
}

function vertsToHeightmap(verts: number[]): Heightmap {
  const mins = [Infinity, Infinity, Infinity];
  const maxs = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < verts.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      mins[a] = Math.min(mins[a], verts[i + a]);
      maxs[a] = Math.max(maxs[a], verts[i + a]);
    }
  }
  const extents = [0, 1, 2].map((a) => Math.max(1e-9, maxs[a] - mins[a]));
  // the flattest axis becomes height; the widest two span the grid
  const hAxis = extents.indexOf(Math.min(...extents));
  const [uAxis, vAxis] = [0, 1, 2].filter((a) => a !== hAxis);

  const cells = new Float32Array(GRID * GRID).fill(-1);
  for (let i = 0; i < verts.length; i += 3) {
    const u = (verts[i + uAxis] - mins[uAxis]) / extents[uAxis];
    const v = 1 - (verts[i + vAxis] - mins[vAxis]) / extents[vAxis];
    const h = (verts[i + hAxis] - mins[hAxis]) / extents[hAxis];
    const x = Math.min(GRID - 1, Math.max(0, Math.round(u * (GRID - 1))));
    const y = Math.min(GRID - 1, Math.max(0, Math.round(v * (GRID - 1))));
    cells[y * GRID + x] = Math.max(cells[y * GRID + x], h);
  }

  // fill gaps between projected vertices from their neighbours
  for (let pass = 0; pass < 6; pass++) {
    let empty = 0;
    const next = cells.slice();
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (cells[y * GRID + x] >= 0) continue;
        let best = -1;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
            best = Math.max(best, cells[ny * GRID + nx]);
          }
        }
        if (best >= 0) next[y * GRID + x] = best * 0.92;
        else empty++;
      }
    }
    cells.set(next);
    if (empty === 0) break;
  }

  // smooth (2 box-blur passes) and normalize to 0..1
  let field = Array.from(cells, (v) => Math.max(0, v));
  for (let pass = 0; pass < 2; pass++) {
    const out = field.slice();
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
            sum += field[ny * GRID + nx];
            n++;
          }
        }
        out[y * GRID + x] = sum / n;
      }
    }
    field = out;
  }
  const peak = Math.max(1e-9, ...field);
  return { size: GRID, data: field.map((v) => +(v / peak).toFixed(3)) };
}

export async function parse3dFileToHeightmap(file: File): Promise<Heightmap> {
  const name = file.name.toLowerCase();
  let verts: number[];
  if (name.endsWith('.obj')) verts = parseObjVertices(await file.text());
  else if (name.endsWith('.stl')) verts = parseStlVertices(await file.arrayBuffer());
  else throw new Error('unsupported');
  if (verts.length < 9) throw new Error('no vertices');
  return vertsToHeightmap(verts);
}
