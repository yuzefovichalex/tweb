export class MathUtils {
  static smoothstep(edge0: number, edge1: number, x: number) {
    x = this.clamp((x - edge0) / (edge1 - edge0));
    return x * x * (3.0 - 2.0 * x);
  }

  static clamp(x: number, lowerlimit: number = 0.0, upperlimit: number = 1.0) {
    if(x < lowerlimit) return lowerlimit;
    if(x > upperlimit) return upperlimit;
    return x;
  }

  static lerp(start: number, stop: number, amount: number): number {
    return (1 - amount) * start + amount * stop;
  }

  static toRadians(angle: number) {
    return angle * Math.PI / 180;
  }

  /**
     * Method for calculating dimensions of an inscribed rectangle
     * where one side is equal to the side of the outer rectangle.
     *
     * @param outerWidth Outer rectangle width.
     * @param outerHeight Outer rectangle height.
     * @param outerRatio Outer rectangle ratio.
     * @param innerRatio Inner rectangle ratio.
     * @returns Dimensions of the inner rectangle.
     */
  static calculateRectanleRelativeDimensions(
    outerWidth: number,
    outerHeight: number,
    outerRatio: number,
    innerRatio: number
  ) {
    let scaleY = 1;
    let scaleX = innerRatio / outerRatio;
    if(scaleX > 1) {
      scaleY = 1 / scaleX;
      scaleX = 1;
    }

    const innerWidth = outerWidth * scaleX;
    const innerHeight = outerHeight * scaleY;
    return {
      width: innerWidth,
      height: innerHeight
    };
  }
}
