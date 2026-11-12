export type Role = 'admin' | 'investigator'
export type CaseStatus = 'Open' | 'In Progress' | 'Under Review' | 'Closed' | 'open' | 'in_progress' | 'closed'
export type FileType = 'Image' | 'Document' | 'Video' | 'Audio' | 'Other'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  status: 'Active' | 'Inactive'
  created: string
}
export interface Case {
  id: string
  caseNumber?: string
  title: string
  description: string
  investigatorId?: string
  status: CaseStatus
  created: string
  updated: string
  assignedInvestigators?: {
    investigator_id: string
    full_name: string
  }[]
}
export interface Evidence {
  id: string
  caseId: string
  filename: string
  type: FileType
  size: number
  description: string
  source: string
  evidenceNumber?: string
  collectorId: string
  collectedAt: string
  registeredAt: string
  custodianId: string
  hash: string
}
export interface CustodyRecord {
  id: string
  evidenceId: string
  fromId: string | null
  toId: string
  at: string
  reason: string
  remarks: string
}
export interface Verification {
  id: string
  evidenceId: string
  at: string
  userId: string
  registeredHash: string
  comparisonHash: string
  filename: string
  method: 'Stored File' | 'Uploaded File'
  result: 'Match' | 'Mismatch'
}
export interface Note {
  id: string
  caseId: string
  authorId: string
  at: string
  content: string
}
export interface AuditEntry {
  id: string
  at: string
  userId: string
  action: string
  recordType: string
  recordId: string
  caseId?: string
  details: string
  rawDetails?: Record<string, any>
}
