import type { RequirementWritePayload } from '@/domain/requirementWrite'
import type { RequirementStatus } from '@/domain/types'
import { isFirebaseBackend } from '@/lib/mode'
import * as local from '@/local/db'
import * as remote from './requirementService.remote'

export type { RequirementWritePayload } from '@/domain/requirementWrite'
export type { RequirementListFilters } from './requirementService.remote'

export const getRequirement = isFirebaseBackend()
  ? remote.getRequirement
  : async (id: string) => local.getRequirement(id)

export const subscribeRequirements = isFirebaseBackend()
  ? remote.subscribeRequirements
  : local.subscribeRequirements

export const subscribeMyRequirements = isFirebaseBackend()
  ? remote.subscribeMyRequirements
  : local.subscribeMyRequirements

export const createRequirement = isFirebaseBackend()
  ? remote.createRequirement
  : async (publisherId: string, payload: RequirementWritePayload) => local.createRequirement(publisherId, payload)

export const updateRequirement = isFirebaseBackend()
  ? remote.updateRequirement
  : async (requirementId: string, payload: RequirementWritePayload) => {
      local.updateRequirement(requirementId, payload)
    }

export const publishRequirement = isFirebaseBackend()
  ? remote.publishRequirement
  : async (requirementId: string) => {
      local.publishRequirement(requirementId)
    }

export const setRequirementLegalStorageUrl = isFirebaseBackend()
  ? remote.setRequirementLegalStorageUrl
  : async (requirementId: string, url: string) => {
      local.setLegalStorageUrl(requirementId, url)
    }

export async function updateRequirementStatusFromAssignment(
  requirementId: string,
  status: RequirementStatus,
) {
  if (isFirebaseBackend()) {
    return remote.updateRequirementStatusFromAssignment(requirementId, status)
  }
  local.setRequirementStatus(requirementId, status)
}

export const fetchAssignmentsForRequirement = isFirebaseBackend()
  ? remote.fetchAssignmentsForRequirement
  : local.fetchAssignmentsForRequirement
