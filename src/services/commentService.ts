import type { RequirementComment } from '@/domain/types'
import { isFirebaseBackend } from '@/lib/mode'
import * as local from '@/local/db'
import * as remote from './commentService.remote'

export const subscribeComments = isFirebaseBackend()
  ? remote.subscribeComments
  : (requirementId: string, onNext: (items: RequirementComment[]) => void, onError?: (e: Error) => void) =>
      local.subscribeComments(requirementId, onNext, onError)

export const addComment = isFirebaseBackend()
  ? remote.addComment
  : async (
      requirementId: string,
      authorId: string,
      authorDisplayName: string,
      text: string,
      parentCommentId: string | null,
      replyToAuthorId: string | null,
      replyToAuthorDisplayName: string | null,
    ) => {
      local.addComment(
        requirementId,
        authorId,
        authorDisplayName,
        text,
        parentCommentId,
        replyToAuthorId,
        replyToAuthorDisplayName,
      )
    }
