/** Story5's narration (scripts/voice.mjs writes voice.json); the engine is shared. */
import { createVoice, type Clip } from '@renderblocks/scene/voice'
import CLIPS from '../voice.json'

export { speak, type Clip } from '@renderblocks/scene/voice'
export const VOICE_DIR = '/games/story5/voice/'
export const { clip, loadClips, say } = createVoice(CLIPS as Record<string, Clip>, VOICE_DIR)
