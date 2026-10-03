const sfx = new Map<string, HTMLAudioElement>()
export function effect(name: 'celebrate' | 'correct' | 'pop', volume = 0.6) {
  let a = sfx.get(name)
  if (!a) {
    a = new Audio(`/games/shared/sfx/${name}.mp3`)
    sfx.set(name, a)
  }
  a.volume = volume
  a.currentTime = 0
  void a.play().catch(() => {})
}
