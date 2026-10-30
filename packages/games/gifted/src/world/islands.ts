/**
 * The three islands: the three parts of the real tests (nonverbal, verbal,
 * quantitative), in the order he meets their first puzzle types.
 */
import { SUBTESTS, type SubtestId } from '../types'

export interface Island {
  id: string
  name: string
  icon: string
  subs: SubtestId[]
}

const inOrder = (subs: SubtestId[]) => SUBTESTS.filter((s) => subs.includes(s))

export const ISLANDS: Island[] = [
  { id: 'shapes', name: 'Shapes', icon: '🔷', subs: inOrder(['figureClassify', 'figureSeries', 'figureMatrix', 'patternCompletion', 'paperFolding']) },
  {
    id: 'words',
    name: 'Pictures & Words',
    icon: '🖼️',
    subs: inOrder(['pictureClassify', 'pictureAnalogy', 'pictureSeries', 'oddOneOut', 'pictureMemory', 'auralReasoning', 'followDirections']),
  },
  { id: 'numbers', name: 'Numbers', icon: '🔢', subs: inOrder(['numberSeries', 'numberAnalogy', 'numberPuzzle']) },
]
