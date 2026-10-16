import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/** Keep a painting as a picture: on the tablet, the share sheet (Photos, Drive…); in a browser, a download. */
export async function savePicture(canvas: HTMLCanvasElement, name: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const data = canvas.toDataURL('image/png').split(',')[1]
    const { uri } = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache })
    await Share.share({ title: 'My painting', files: [uri], dialogTitle: 'Keep the painting' })
    return
  }
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) return
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
