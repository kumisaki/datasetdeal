import type { Modality, RequirementStatus } from './types'

export interface RequirementWritePayload {
  title: string
  summary: string
  description: string
  modality: Modality
  format: string
  collectionConstraints: string
  qualityQuantity: string
  legalUrl: string
  budgetText: string
  deadline: string
  status: RequirementStatus
}
