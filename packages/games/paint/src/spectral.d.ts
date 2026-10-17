declare module 'spectral.js' {
  export class Color {
    constructor(colour: string)
    toString(opts?: { format?: 'hex' | 'rgb' | 'oklch' }): string
  }
  export function mix(...colours: [Color, number][]): Color
}
