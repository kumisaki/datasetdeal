import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'

import { legalStoragePath } from '@/domain/paths'
import { requireStorage } from '@/lib/firebase'

export async function uploadLegalDocument(requirementId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const path = legalStoragePath(requirementId, `${Date.now()}_${safeName}`)
  const storageRef = ref(requireStorage(), path)
  await uploadBytes(storageRef, file, { contentType: file.type || undefined })
  return getDownloadURL(storageRef)
}
