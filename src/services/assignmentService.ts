import { isFirebaseBackend } from '@/lib/mode'
import * as local from '@/local/db'
import * as remote from './assignmentService.remote'

export const createAssignmentRequest = isFirebaseBackend()
  ? remote.createAssignmentRequest
  : async (requirementId: string, publisherId: string, contributorId: string) => {
      local.createAssignmentRequest(requirementId, publisherId, contributorId)
    }

export const subscribeAssignmentsForRequirement = isFirebaseBackend()
  ? remote.subscribeAssignmentsForRequirement
  : local.subscribeAssignmentsForRequirement

export const subscribeMyAssignments = isFirebaseBackend()
  ? remote.subscribeMyAssignments
  : local.subscribeMyAssignments

export const confirmAssignment = isFirebaseBackend()
  ? remote.confirmAssignment
  : async (assignmentId: string, requirementId: string) => {
      local.confirmAssignment(assignmentId, requirementId)
    }

export const declineAssignment = isFirebaseBackend()
  ? remote.declineAssignment
  : async (assignmentId: string) => {
      local.declineAssignment(assignmentId)
    }

export const completeAssignment = isFirebaseBackend()
  ? remote.completeAssignment
  : async (assignmentId: string, requirementId: string) => {
      local.completeAssignment(assignmentId, requirementId)
    }

export const cancelRequirementToOpen = isFirebaseBackend()
  ? remote.cancelRequirementToOpen
  : async (requirementId: string) => {
      local.cancelRequirementToOpen(requirementId)
    }
