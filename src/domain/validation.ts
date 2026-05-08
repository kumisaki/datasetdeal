import { z } from 'zod'

import { ASSIGNMENT_STATUSES, MODALITIES, REQUIREMENT_STATUSES } from './types'

export const registerSchema = z.object({
  displayName: z.string().min(2, 'Display name is too short').max(80),
  email: z.string().email(),
  password: z.string().min(8, 'Use at least 8 characters'),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password required'),
})

export const requirementFormSchema = z.object({
  title: z.string().min(3).max(200),
  summary: z.string().max(500).optional().default(''),
  description: z.string().min(10).max(20000),
  modality: z.enum(MODALITIES),
  format: z.string().min(1).max(500),
  collectionConstraints: z.string().max(10000).optional().default(''),
  qualityQuantity: z.string().max(10000).optional().default(''),
  legalUrl: z.union([z.literal(''), z.string().url()]).default(''),
  budgetText: z.string().max(2000).optional().default(''),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  status: z.enum(REQUIREMENT_STATUSES),
})

export const messageSchema = z.object({
  text: z.string().min(1).max(5000),
})

export const commentSchema = z.object({
  text: z.string().min(1).max(2000),
})

export const assignmentStatusSchema = z.enum(ASSIGNMENT_STATUSES)

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RequirementFormInput = z.infer<typeof requirementFormSchema>
