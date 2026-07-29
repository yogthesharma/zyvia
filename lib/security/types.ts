export type DeviceSession = {
  id: string
  sessionKey: string
  userAgent: string | null
  ip: string | null
  lastSeenAt: string
  createdAt: string
  isCurrent: boolean
}

export type PersonalApiKey = {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
}

export type SecurityActionResult = {
  error?: string
  sessions?: DeviceSession[]
  keys?: PersonalApiKey[]
  /** Plaintext secret — only returned once on create. */
  secret?: string
  key?: PersonalApiKey
}
