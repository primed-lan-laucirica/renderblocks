import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/**
 * Export (spec: export and import): on the tablet, write the file and open
 * the share sheet (Drive, email, Files…); in a browser, download it.
 */
export async function saveFile(name: string, text: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title: 'Calendar backup', text: 'RenderBlocks calendar data', url: uri, dialogTitle: 'Save the calendar backup' })
    return
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Pick a file and read it as text (the system file chooser, on the tablet too). */
export function openFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = () => {
      const f = input.files?.[0]
      if (!f) return resolve(null)
      f.text().then(resolve, () => resolve(null))
    }
    input.click()
  })
}

/** A task photo from the camera or gallery, small enough to keep in the saved data. */
export async function takePhoto(): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      quality: 60,
      width: 500,
      promptLabelHeader: 'Task photo',
    })
    return photo.base64String ? `data:image/${photo.format};base64,${photo.base64String}` : null
  } catch {
    return null // cancelled
  }
}
