import { isFirebaseBackend } from '@/lib/mode'
import * as local from '@/local/db'
import * as remote from './storageService.remote'

export async function uploadLegalDocument(requirementId: string, file: File): Promise<string> {
  if (isFirebaseBackend()) {
    return remote.uploadLegalDocument(requirementId, file)
  }
  return local.uploadLegalDocumentLocal(requirementId, file)
}
