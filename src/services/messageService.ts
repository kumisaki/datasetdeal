import { isFirebaseBackend } from '@/lib/mode'
import * as local from '@/local/db'
import * as remote from './messageService.remote'

export const sendMessage = isFirebaseBackend()
  ? remote.sendMessage
  : async (requirementId: string, contributorUid: string, senderId: string, text: string) => {
      local.sendMessage(requirementId, contributorUid, senderId, text)
    }

export const subscribeMessages = isFirebaseBackend()
  ? remote.subscribeMessages
  : local.subscribeMessages

export const subscribeRequirementThreadPartners = isFirebaseBackend()
  ? remote.subscribeRequirementThreadPartners
  : local.subscribeRequirementThreadPartners
