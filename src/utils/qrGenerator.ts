/* eslint-disable no-bitwise */
/**
 * qrGenerator.ts — Pure JavaScript ISO/IEC 18004 QR Code Matrix Generator.
 *
 * Generates a standard QR code matrix for byte-mode data using ECL Medium.
 * Supports versions 1–6 (covers URLs up to ~84 bytes — sufficient for all
 * Techies TechPass deep-link payloads).
 *
 * Returns a boolean[][] (true = dark, false = light) including a 4-module
 * quiet zone on every side. No dependencies.
 */

// ─── GF(256) Arithmetic ──────────────────────────────────────────────────────

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  // Primitive polynomial: x^8 + x^4 + x^3 + x^2 + 1 = 0x11D
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = x << 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
    x &= 0xff;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) {
    return 0;
  }
  return GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255];
}

// ─── Reed-Solomon Error Correction ───────────────────────────────────────────

/** Build generator polynomial g(x) = ∏(x + α^i) for i = 0..nroots-1 */
function rsGeneratorPoly(nroots: number): number[] {
  let g = [1];
  for (let i = 0; i < nroots; i++) {
    const ai = GF_EXP[i];
    const newG: number[] = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      newG[j] ^= g[j];
      newG[j + 1] ^= gfMul(g[j], ai);
    }
    g = newG;
  }
  return g;
}

/** Compute numEC error-correction codewords for the given data block. */
function computeECCodewords(data: number[], numEC: number): number[] {
  const gen = rsGeneratorPoly(numEC);
  const result = [...data, ...new Array(numEC).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = result[i];
    if (coef !== 0) {
      for (let j = 1; j <= numEC; j++) {
        result[i + j] ^= gfMul(coef, gen[j]);
      }
    }
  }
  return result.slice(data.length);
}

// ─── ECL M Block Structure Table ─────────────────────────────────────────────
//
// Columns: [ecPerBlock, g1Blocks, g1DataCW, g2Blocks, g2DataCW]
// Verified: g1Blocks*g1DataCW + g2Blocks*g2DataCW = totalDataCW
//           totalCW = (g1Blocks+g2Blocks) * (ecPerBlock + dataCW per block)
//   v1: 1*(10+16)=26 ✓   v2: 1*(16+28)=44 ✓   v3: 2*(18+17)=70 ✓
//   v4: 2*(24+26)=100 ✓  v5: 2*(34+33)=134 ✓  v6: 2*(43+43)=172 ✓
//
type BlockEntry = [number, number, number, number, number];

const ECL_M_BLOCKS: BlockEntry[] = [
  [10, 1, 16, 0, 0], // version 1 — byte capacity 14
  [16, 1, 28, 0, 0], // version 2 — byte capacity 26
  [18, 2, 17, 0, 0], // version 3 — byte capacity 32
  [24, 2, 26, 0, 0], // version 4 — byte capacity 50
  [34, 2, 33, 0, 0], // version 5 — byte capacity 64
  [43, 2, 43, 0, 0], // version 6 — byte capacity 84
];

function totalDataCW(version: number): number {
  const [, g1b, g1d, g2b, g2d] = ECL_M_BLOCKS[version - 1];
  return g1b * g1d + g2b * g2d;
}

/** Maximum bytes encodable in byte mode for ECL M at this version. */
function byteCapacity(version: number): number {
  return Math.floor((totalDataCW(version) * 8 - 12) / 8);
}

/** QR symbol size in modules (no quiet zone): 17 + 4 * version */
function symbolSize(version: number): number {
  return 17 + 4 * version;
}

// ─── Data Encoding ────────────────────────────────────────────────────────────

/**
 * Encode text in byte mode, apply RS error correction, and interleave
 * codewords for the given QR version (ECL M).
 */
function encodeData(text: string, version: number): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i) & 0xff);
  }

  const [ecPerBlock, g1Blocks, g1DataCW, g2Blocks, g2DataCW] = ECL_M_BLOCKS[version - 1];
  const dataCapacity = totalDataCW(version);

  // ── Build bit stream ──────────────────────────────────────────────────────
  const bits: number[] = [];

  const pushBits = (val: number, len: number): void => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  pushBits(0b0100, 4); // mode indicator: byte mode
  pushBits(bytes.length, 8); // char count (8 bits for v1–9)
  for (const b of bytes) {
    pushBits(b, 8);
  }

  const maxBits = dataCapacity * 8;

  // Terminator (up to 4 zero bits)
  for (let i = 0; i < 4 && bits.length < maxBits; i++) {
    bits.push(0);
  }

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad codewords (0xEC / 0x11 alternating)
  let padByte = 0;
  while (bits.length < maxBits) {
    pushBits(padByte === 0 ? 0xec : 0x11, 8);
    padByte = 1 - padByte;
  }

  // ── Build codeword array ──────────────────────────────────────────────────
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | (bits[i + j] ?? 0);
    }
    codewords.push(b);
  }

  // ── Split into blocks ─────────────────────────────────────────────────────
  const allBlocks: number[][] = [];
  let offset = 0;
  for (let i = 0; i < g1Blocks; i++) {
    allBlocks.push(codewords.slice(offset, offset + g1DataCW));
    offset += g1DataCW;
  }
  for (let i = 0; i < g2Blocks; i++) {
    allBlocks.push(codewords.slice(offset, offset + g2DataCW));
    offset += g2DataCW;
  }

  const ecBlocks = allBlocks.map((block) => computeECCodewords(block, ecPerBlock));

  // ── Interleave data codewords ─────────────────────────────────────────────
  const interleaved: number[] = [];
  const maxBlockLen = Math.max(...allBlocks.map((b) => b.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (const block of allBlocks) {
      if (i < block.length) {
        interleaved.push(block[i]);
      }
    }
  }

  // ── Interleave EC codewords ───────────────────────────────────────────────
  for (let i = 0; i < ecPerBlock; i++) {
    for (const ecBlock of ecBlocks) {
      interleaved.push(ecBlock[i]);
    }
  }

  return interleaved;
}

// ─── Format Info ─────────────────────────────────────────────────────────────

/**
 * Compute the 15-bit format information string for ECL M (format bits = 0)
 * and the given mask pattern using BCH(15,5) and mask value 0x5412.
 */
function formatInfoBits(maskPat: number): number {
  const data = maskPat; // ECL M = 0b00, so data = (0<<3)|mask = mask
  let rem = data;
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

// ─── Matrix Building ──────────────────────────────────────────────────────────

type MaybeModule = boolean | null; // null = unfilled data position

function createGrid(n: number): MaybeModule[][] {
  return Array.from({ length: n }, () => new Array<MaybeModule>(n).fill(null));
}

/** Place a 7×7 finder pattern with separator. */
function placeFinder(mat: MaybeModule[][], topRow: number, topCol: number): void {
  const n = mat.length;
  // Separator border (one-module ring of light around finder)
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const mr = topRow + r;
      const mc = topCol + c;
      if (mr < 0 || mc < 0 || mr >= n || mc >= n) {
        continue;
      }
      if (r === -1 || r === 7 || c === -1 || c === 7) {
        mat[mr][mc] = false; // separator (light)
      } else {
        // 7×7 finder body
        const inOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        mat[mr][mc] = inOuter || inInner;
      }
    }
  }
}

/** Place a 5×5 alignment pattern centred at (row, col). */
function placeAlignment(mat: MaybeModule[][], row: number, col: number): void {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isEdge = r === -2 || r === 2 || c === -2 || c === 2;
      const isCenter = r === 0 && c === 0;
      mat[row + r][col + c] = isEdge || isCenter;
    }
  }
}

/** Place timing strips (row 6, col 6). */
function placeTiming(mat: MaybeModule[][], n: number): void {
  for (let i = 8; i < n - 8; i++) {
    mat[6][i] = i % 2 === 0;
    mat[i][6] = i % 2 === 0;
  }
}

/** Write format info around the finder patterns (both copies). */
function placeFormatInfo(mat: MaybeModule[][], maskPat: number): void {
  const n = mat.length;
  const bits = formatInfoBits(maskPat);

  // ── Copy 1: around TL finder ──────────────────────────────────────────────
  // Row 8, cols 0-5 → bits 0-5 (LSB first)
  for (let i = 0; i <= 5; i++) {
    mat[8][i] = ((bits >>> i) & 1) === 1;
  }
  // Row 8, col 7 → bit 6; row 8, col 8 → bit 7
  mat[8][7] = ((bits >>> 6) & 1) === 1;
  mat[8][8] = ((bits >>> 7) & 1) === 1;
  // Col 8, row 7 → bit 8; col 8, rows 5-0 → bits 9-14
  mat[7][8] = ((bits >>> 8) & 1) === 1;
  for (let i = 9; i <= 14; i++) {
    mat[14 - i][8] = ((bits >>> i) & 1) === 1;
  }

  // ── Copy 2: around TR finder (row 8) + BL finder (col 8) ─────────────────
  // Row 8, cols n-7..n-1 → bits 8..14
  for (let i = 8; i <= 14; i++) {
    mat[8][n - 15 + i] = ((bits >>> i) & 1) === 1;
  }
  // Col 8, rows n-7..n-1 → bits 6..0 (and always-dark at n-8)
  mat[n - 8][8] = true; // always-dark module
  for (let i = 0; i <= 6; i++) {
    mat[n - 7 + i][8] = ((bits >>> i) & 1) === 1;
  }
}

/** Build a boolean[][] marking every functional (non-data) module. */
function buildFunctionMask(n: number, version: number, alignPositions: number[]): boolean[][] {
  const func = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));

  const markRect = (r1: number, c1: number, r2: number, c2: number): void => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (r >= 0 && c >= 0 && r < n && c < n) {
          func[r][c] = true;
        }
      }
    }
  };

  // Finders + separators
  markRect(-1, -1, 7, 7); // TL
  markRect(-1, n - 8, 7, n); // TR
  markRect(n - 8, -1, n, 7); // BL

  // Timing
  for (let i = 0; i < n; i++) {
    func[6][i] = true;
    func[i][6] = true;
  }

  // Alignment patterns (5×5)
  const ap = alignPositions;
  for (const r of ap) {
    for (const c of ap) {
      // Skip if overlapping a finder pattern
      if ((r <= 8 && c <= 8) || (r <= 8 && c >= n - 9) || (r >= n - 9 && c <= 8)) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          func[r + dr][c + dc] = true;
        }
      }
    }
  }

  // Format info (copy 1 and 2)
  // TL area: row 8 cols 0-8, col 8 rows 0-8 (including dark module at n-8,8)
  markRect(8, 0, 8, 8);
  markRect(0, 8, 8, 8);
  // TR area: row 8, cols n-7 to n-1
  markRect(8, n - 7, 8, n - 1);
  // BL area: col 8, rows n-7 to n-1 + dark module
  markRect(n - 8, 8, n - 1, 8);

  // Version info (v7+): not needed here
  void version;

  return func;
}

/** Place interleaved data+EC bits into all non-functional module positions. */
function placeDataBits(mat: MaybeModule[][], funcMask: boolean[][], codewords: number[]): void {
  const n = mat.length;
  const bits: number[] = [];
  for (const cw of codewords) {
    for (let i = 7; i >= 0; i--) {
      bits.push((cw >>> i) & 1);
    }
  }

  let bitIdx = 0;
  let goingUp = true;

  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right--; // skip timing column
    }
    for (let vert = 0; vert < n; vert++) {
      const row = goingUp ? n - 1 - vert : vert;
      for (let j = 0; j <= 1; j++) {
        const col = right - j;
        if (!funcMask[row][col] && mat[row][col] === null) {
          mat[row][col] = bitIdx < bits.length ? bits[bitIdx++] === 1 : false;
        }
      }
    }
    goingUp = !goingUp;
  }
}

// ─── Masking ──────────────────────────────────────────────────────────────────

function maskModule(row: number, col: number, maskPat: number): boolean {
  switch (maskPat) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return false;
  }
}

/** Apply mask to a copy of the matrix, skipping functional modules. */
function applyMask(mat: MaybeModule[][], funcMask: boolean[][], maskPat: number): boolean[][] {
  return mat.map((row, r) =>
    row.map((cell, c) => {
      const dark = cell === true;
      return funcMask[r][c] ? dark : dark !== maskModule(r, c, maskPat);
    }),
  );
}

/**
 * Compute penalty score for mask pattern evaluation.
 * Implements all 4 QR penalty rules.
 */
function penaltyScore(mat: boolean[][], n: number): number {
  let score = 0;

  // Rule 1: 5+ consecutive same-color in rows/cols
  for (let r = 0; r < n; r++) {
    let rowRun = 1;
    let colRun = 1;
    for (let c = 1; c < n; c++) {
      // Row
      if (mat[r][c] === mat[r][c - 1]) {
        rowRun++;
        if (rowRun === 5) {
          score += 3;
        } else if (rowRun > 5) {
          score += 1;
        }
      } else {
        rowRun = 1;
      }
      // Column
      if (mat[c][r] === mat[c - 1][r]) {
        colRun++;
        if (colRun === 5) {
          score += 3;
        } else if (colRun > 5) {
          score += 1;
        }
      } else {
        colRun = 1;
      }
    }
  }

  // Rule 2: 2×2 blocks of same color
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = mat[r][c];
      if (mat[r][c + 1] === v && mat[r + 1][c] === v && mat[r + 1][c + 1] === v) {
        score += 3;
      }
    }
  }

  // Rule 3: finder-like patterns in rows/cols
  const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pat2 = [false, false, false, false, true, false, true, true, true, false, true];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c <= n - 11; c++) {
      let m1 = true;
      let m2 = true;
      for (let k = 0; k < 11; k++) {
        if (mat[r][c + k] !== pat1[k]) {
          m1 = false;
        }
        if (mat[r][c + k] !== pat2[k]) {
          m2 = false;
        }
      }
      if (m1) {
        score += 40;
      }
      if (m2) {
        score += 40;
      }
    }
  }
  for (let c = 0; c < n; c++) {
    for (let r = 0; r <= n - 11; r++) {
      let m1 = true;
      let m2 = true;
      for (let k = 0; k < 11; k++) {
        if (mat[r + k][c] !== pat1[k]) {
          m1 = false;
        }
        if (mat[r + k][c] !== pat2[k]) {
          m2 = false;
        }
      }
      if (m1) {
        score += 40;
      }
      if (m2) {
        score += 40;
      }
    }
  }

  // Rule 4: proportion of dark modules
  let dark = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (mat[r][c]) {
        dark++;
      }
    }
  }
  const total = n * n;
  const pct = Math.abs((dark / total) * 100 - 50);
  score += Math.floor(pct / 5) * 10;

  return score;
}

// ─── Alignment Pattern Positions ─────────────────────────────────────────────

const ALIGN_POS: number[][] = [
  [], // v1
  [6, 18], // v2
  [6, 22], // v3
  [6, 26], // v4
  [6, 30], // v5
  [6, 34], // v6
];

// ─── Public API ───────────────────────────────────────────────────────────────

export interface QRCodeMatrix {
  /** boolean[][] where true = dark module, false = light module */
  matrix: boolean[][];
  /** Total matrix size in modules (including 4-module quiet zone on each side) */
  size: number;
}

/**
 * Generate a scannable QR code matrix for the given text string.
 *
 * Uses ECL Medium (M) for balanced data/error-correction capacity.
 * Automatically selects the minimum QR version (1–6) that fits the payload.
 * Includes a 4-module quiet zone around the symbol.
 *
 * @throws Error if the text exceeds the maximum supported capacity (~84 bytes).
 */
export function generateQRMatrix(text: string): QRCodeMatrix {
  // ── Select version ───────────────────────────────────────────────────────
  let version = -1;
  for (let v = 1; v <= ECL_M_BLOCKS.length; v++) {
    if (text.length <= byteCapacity(v)) {
      version = v;
      break;
    }
  }
  if (version === -1) {
    throw new Error(
      `QR payload too long (${text.length} bytes). Max supported: ${byteCapacity(ECL_M_BLOCKS.length)}.`,
    );
  }

  const n = symbolSize(version);
  const alignPos = ALIGN_POS[version - 1];

  // ── Encode data ───────────────────────────────────────────────────────────
  const codewords = encodeData(text, version);

  // ── Build base matrix with functional patterns ────────────────────────────
  const base = createGrid(n);
  placeFinder(base, 0, 0); // TL finder
  placeFinder(base, 0, n - 7); // TR finder
  placeFinder(base, n - 7, 0); // BL finder
  placeTiming(base, n);

  for (const r of alignPos) {
    for (const c of alignPos) {
      if ((r <= 8 && c <= 8) || (r <= 8 && c >= n - 9) || (r >= n - 9 && c <= 8)) {
        continue;
      }
      placeAlignment(base, r, c);
    }
  }

  const funcMask = buildFunctionMask(n, version, alignPos);

  // Place format info with dummy mask=0 (overwrites real format later)
  placeFormatInfo(base, 0);

  // Place data bits
  placeDataBits(base, funcMask, codewords);

  // ── Evaluate all 8 mask patterns ─────────────────────────────────────────
  let bestMask = 0;
  let bestScore = Infinity;

  for (let m = 0; m < 8; m++) {
    // Temporarily write format info for mask m
    const trial = base.map((row) => [...row]); // shallow clone
    placeFormatInfo(trial as MaybeModule[][], m);
    const masked = applyMask(trial as MaybeModule[][], funcMask, m);
    const score = penaltyScore(masked, n);
    if (score < bestScore) {
      bestScore = score;
      bestMask = m;
    }
  }

  // ── Build final matrix with best mask ─────────────────────────────────────
  placeFormatInfo(base as MaybeModule[][], bestMask);
  const finalSymbol = applyMask(base as MaybeModule[][], funcMask, bestMask);

  // ── Add 4-module quiet zone ───────────────────────────────────────────────
  const QZ = 4;
  const totalSize = n + QZ * 2;
  const matrix: boolean[][] = Array.from({ length: totalSize }, (_, r) =>
    Array.from({ length: totalSize }, (__, c) => {
      const sr = r - QZ;
      const sc = c - QZ;
      if (sr < 0 || sc < 0 || sr >= n || sc >= n) {
        return false; // quiet zone = light
      }
      return finalSymbol[sr][sc];
    }),
  );

  return { matrix, size: totalSize };
}
