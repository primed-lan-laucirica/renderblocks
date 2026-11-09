/** The Symbols narration (scripts/voice.mjs writes voice.json); the engine is shared. */
import { createVoice, type Clip } from '@renderblocks/scene/voice'
import CLIPS from '../voice.json'

export const VOICE_DIR = '/games/symbols/voice/'
export const { clip, loadClips, say } = createVoice(CLIPS as Record<string, Clip>, VOICE_DIR)
