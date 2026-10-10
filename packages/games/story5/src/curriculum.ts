/** The series: Episode 0, then 26 episodes in six parts, each part ending in a workshop. */
export interface Part {
  n: number
  title: string
  grades: string
  workshop: string
  episodes: { n: number; title: string }[]
}

export const PARTS: Part[] = [
  {
    n: 1,
    title: 'Quantity',
    grades: 'K',
    workshop: 'Counting Table',
    episodes: [
      { n: 1, title: 'One for one' },
      { n: 2, title: 'Counting' },
      { n: 3, title: 'Number rods' },
      { n: 4, title: 'The track' },
    ],
  },
  {
    n: 2,
    title: 'Place value',
    grades: 'K–2',
    workshop: 'Bead Bank',
    episodes: [
      { n: 5, title: 'Ten' },
      { n: 6, title: 'Hundreds and thousands' },
      { n: 7, title: 'Numeral cards' },
      { n: 8, title: 'Teens and tens' },
      { n: 9, title: 'Three ways to 23' },
    ],
  },
  {
    n: 3,
    title: 'Adding and taking away',
    grades: 'K–2',
    workshop: 'Stamp Game',
    episodes: [
      { n: 10, title: 'Joining' },
      { n: 11, title: 'Partners of ten' },
      { n: 12, title: 'Taking away' },
      { n: 13, title: 'Carrying' },
      { n: 14, title: 'Borrowing' },
    ],
  },
  {
    n: 4,
    title: 'Multiplying and dividing',
    grades: '2–4',
    workshop: 'Bead Board',
    episodes: [
      { n: 15, title: 'Equal groups' },
      { n: 16, title: 'Arrays' },
      { n: 17, title: 'Times ten' },
      { n: 18, title: 'Sharing' },
      { n: 19, title: 'How many groups' },
    ],
  },
  {
    n: 5,
    title: 'Fractions',
    grades: '3–4',
    workshop: 'Fraction Table',
    episodes: [
      { n: 20, title: 'Parts of a whole' },
      { n: 21, title: 'Fractions on the track' },
      { n: 22, title: 'The same amount' },
      { n: 23, title: 'Adding fractions' },
      { n: 24, title: 'Groups of a fraction' },
    ],
  },
  {
    n: 6,
    title: 'Decimals',
    grades: '4',
    workshop: 'Decimal Board',
    episodes: [
      { n: 25, title: 'Tenths' },
      { n: 26, title: 'Both ways by tens' },
    ],
  },
]
