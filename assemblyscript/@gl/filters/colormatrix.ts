import * as filters from "../api/w2h/filters";

type ColorMatrix = f32[];

export class ColorMatrixFilter {
  private _matrix: ColorMatrix;
  private _id: i32;

  constructor() {
    // prettier-ignore
    this._matrix = [
        1, 0, 0, 0, 0,
        0, 1, 0, 0, 0,
        0, 0, 1, 0, 0,
        0, 0, 0, 1, 0,
    ];
    this._id = filters.addColorMatrix();
  }

  set influence(amt: f32) {
    filters.setFilterInfluence(this._id, amt);
  }

  private _sync(): void {
    filters.setColorMatrix(this._id, this._matrix);
  }

  private _loadMatrix(matrix: ColorMatrix, multiply: boolean = false): void {
    const newMatrix = matrix;
    if (multiply) {
      this._multiply(newMatrix, this.matrix, matrix);
    }
    this._matrix = newMatrix;
    this._sync();
  }

  public brightness(b: f32, multiply: boolean = false): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
        b, 0, 0, 0, 0,
        0, b, 0, 0, 0,
        0, 0, b, 0, 0,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public greyscale(scale: f32, multiply: boolean = false): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
        scale, scale, scale, 0, 0,
        scale, scale, scale, 0, 0,
        scale, scale, scale, 0, 0,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public tint(r: f32, g: f32, b: f32, multiply: boolean = false): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
        r, 0, 0, 0, 0,
        0, g, 0, 0, 0,
        0, 0, b, 0, 0,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public overlay(r: f32, g: f32, b: f32, multiply: boolean = false): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
        1-r, 0, 0, 0, r,
        0, 1-g, 0, 0, g,
        0, 0, 1-b, 0, b,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public sepia(multiply: boolean = false): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
        0.393, 0.769, 0.189, 0, 0,
        0.349, 0.686, 0.168, 0, 0,
        0.272, 0.534, 0.131, 0, 0,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public contrast(amount: f32, multiply: boolean = false): void {
    const v: f32 = (amount || 0) + 1;
    const o: f32 = -0.5 * (v - 1);

    // prettier-ignore
    const matrix: ColorMatrix = [
        v, 0, 0, 0, o,
        0, v, 0, 0, o,
        0, 0, v, 0, o,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public negative(multiply: boolean = false): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
        -1, 0, 0, 0, 1,
        0, -1, 0, 0, 1,
        0, 0, -1, 0, 1,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public kodachrome(multiply: boolean = false): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
        1.1285582396593525, -0.3967382283601348, -0.03992559172921793, 0, 0.24991995145868634,
        -0.16404339962244616, 1.0835251566291304, -0.05498805115633132, 0, 0.09698983488904393,
        -0.16786010706155763, -0.5603416277695248, 1.6014850761964943, 0, 0.13972481597886063,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public vintage(multiply: boolean = false): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
        0.6279345635605994, 0.3202183420819367, -0.03965408211312453, 0, 0.037848179746251466,
        0.02578397704808868, 0.6441188644374771, 0.03259127616149294, 0, 0.029265996770472907,
        0.0466055556782719, -0.0851232987247891, 0.5241648018700465, 0, 0.020232119953863904,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public technicolor(multiply: boolean = false): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
        1.9125277891456083, -0.8545344976951645, -0.09155508482755585, 0, 0.046249425232852304,
        -0.3087833385928097, 1.7658908555458428, -0.10601743074722245, 0, -0.2758903984886823,
        -0.231103377548616, -0.7501899197440212, 1.847597816108189, 0, 0.12137623870388682,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public polaroid(multiply: boolean = false): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
        1.438, -0.062, -0.062, 0, 0,
        -0.122, 1.378, -0.122, 0, 0,
        -0.016, -0.016, 1.483, 0, 0,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public blackAndWhite(multiply: boolean = false): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
        0.3, 0.6, 0.1, 0, 0,
        0.3, 0.6, 0.1, 0, 0,
        0.3, 0.6, 0.1, 0, 0,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public hue(rotation: f32, multiply: boolean = false): void {
    const rad = ((rotation || 0) / 180) * Math.PI;
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);

    // prettier-ignore
    const matrix: ColorMatrix = [
        0.213 + cosR * 0.787 - sinR * 0.213, 0.213 - cosR * 0.213 + sinR * 0.143, 0.213 - cosR * 0.213 - sinR * 0.787, 0, 0,
        0.715 - cosR * 0.715 - sinR * 0.715, 0.715 + cosR * 0.285 + sinR * 0.140, 0.715 - cosR * 0.715 + sinR * 0.715, 0, 0,
        0.072 - cosR * 0.072 + sinR * 0.928, 0.072 - cosR * 0.072 - sinR * 0.283, 0.072 + cosR * 0.928 + sinR * 0.072, 0, 0,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public saturate(amount: f32, multiply: boolean = false): void {
    const x = (amount * 2) / 3 + 1;
    const y = (x - 1) * -0.5;

    // prettier-ignore
    const matrix: ColorMatrix = [
        x, y, y, 0, 0,
        y, x, y, 0, 0,
        y, y, x, 0, 0,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public desaturate(multiply: boolean = false): void {
    this.saturate(-1, multiply);
  }

  public night(intensity: f32, multiply: boolean = false): void {
    intensity = intensity || 0.1;
    // prettier-ignore
    const matrix: ColorMatrix = [
        intensity * -2.0, -intensity, 0, 0, 0,
        -intensity, 0, intensity, 0, 0,
        0, intensity, intensity * 2.0, 0, 0,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public predator(amount: f32, multiply: boolean = false): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
        11.224130630493164 * amount, -4.794486999511719 * amount, -2.8746118545532227 * amount, 0, 0.40342438220977783 * amount,
        -3.6330697536468506 * amount, 9.193157196044922 * amount, -2.951810836791992 * amount, 0, -1.316135048866272 * amount,
        -3.2184197902679443 * amount, -4.2375030517578125 * amount, 7.476448059082031 * amount, 0, 0.8044459223747253 * amount,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public lsd(multiply: boolean = false): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
        2, -0.4, 0.5, 0, 0,
        -0.5, 2, -0.4, 0, 0,
        -0.4, -0.5, 3, 0, 0,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public water(multiply: boolean = false): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
         0.2, 0.1, 0.2, 0, 0,
         0.1, 0.5, 0.2, 0, 0,
         0.3, 0.5, 1.0, 0, 0,
         0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, multiply);
  }

  public hot(multiply: boolean = false): void {
    this.tint(0.7, 0.5, 0.4, multiply);
    this.brightness(1.8, true);
    this.contrast(0.4, true);
  }

  public reset(): void {
    // prettier-ignore
    const matrix: ColorMatrix = [
        1, 0, 0, 0, 0,
        0, 1, 0, 0, 0,
        0, 0, 1, 0, 0,
        0, 0, 0, 1, 0,
    ];

    this._loadMatrix(matrix, false);
  }

  /**
   * Multiplies two mat5's
   * @private
   * @param out - 5x4 matrix the receiving matrix
   * @param a - 5x4 matrix the first operand
   * @param b - 5x4 matrix the second operand
   * @returns {number[]} 5x4 matrix
   */
  private _multiply(
    out: ColorMatrix,
    a: ColorMatrix,
    b: ColorMatrix
  ): ColorMatrix {
    // Red Channel
    out[0] = a[0] * b[0] + a[1] * b[5] + a[2] * b[10] + a[3] * b[15];
    out[1] = a[0] * b[1] + a[1] * b[6] + a[2] * b[11] + a[3] * b[16];
    out[2] = a[0] * b[2] + a[1] * b[7] + a[2] * b[12] + a[3] * b[17];
    out[3] = a[0] * b[3] + a[1] * b[8] + a[2] * b[13] + a[3] * b[18];
    out[4] = a[0] * b[4] + a[1] * b[9] + a[2] * b[14] + a[3] * b[19] + a[4];

    // Green Channel
    out[5] = a[5] * b[0] + a[6] * b[5] + a[7] * b[10] + a[8] * b[15];
    out[6] = a[5] * b[1] + a[6] * b[6] + a[7] * b[11] + a[8] * b[16];
    out[7] = a[5] * b[2] + a[6] * b[7] + a[7] * b[12] + a[8] * b[17];
    out[8] = a[5] * b[3] + a[6] * b[8] + a[7] * b[13] + a[8] * b[18];
    out[9] = a[5] * b[4] + a[6] * b[9] + a[7] * b[14] + a[8] * b[19] + a[9];

    // Blue Channel
    out[10] = a[10] * b[0] + a[11] * b[5] + a[12] * b[10] + a[13] * b[15];
    out[11] = a[10] * b[1] + a[11] * b[6] + a[12] * b[11] + a[13] * b[16];
    out[12] = a[10] * b[2] + a[11] * b[7] + a[12] * b[12] + a[13] * b[17];
    out[13] = a[10] * b[3] + a[11] * b[8] + a[12] * b[13] + a[13] * b[18];
    out[14] =
      a[10] * b[4] + a[11] * b[9] + a[12] * b[14] + a[13] * b[19] + a[14];

    // Alpha Channel
    out[15] = a[15] * b[0] + a[16] * b[5] + a[17] * b[10] + a[18] * b[15];
    out[16] = a[15] * b[1] + a[16] * b[6] + a[17] * b[11] + a[18] * b[16];
    out[17] = a[15] * b[2] + a[16] * b[7] + a[17] * b[12] + a[18] * b[17];
    out[18] = a[15] * b[3] + a[16] * b[8] + a[17] * b[13] + a[18] * b[18];
    out[19] =
      a[15] * b[4] + a[16] * b[9] + a[17] * b[14] + a[18] * b[19] + a[19];

    return out;
  }

  public get matrix(): ColorMatrix {
    return this._matrix;
  }
}
