export const USER_ROLES = {
  STANDARD_USER: 1001,
  KYC_REVIEWER: 2001,
  COMMUNITY_MODERATOR: 3001,
  DISPUTE_RESOLVER: 4001,
  SUPER_ADMIN: 9001,
} as const

export const ROLE_KEYS = {
  STANDARD_USER: 'standardUser',
  KYC_REVIEWER: 'kycReviewer',
  COMMUNITY_MODERATOR: 'communityModerator',
  DISPUTE_RESOLVER: 'disputeResolver',
  SUPER_ADMIN: 'superAdmin',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]
export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS]
export type UserRoles = Partial<Record<RoleKey, UserRole>>

export const ROLE_CODES_BY_KEY: Record<RoleKey, UserRole> = {
  [ROLE_KEYS.STANDARD_USER]: USER_ROLES.STANDARD_USER,
  [ROLE_KEYS.KYC_REVIEWER]: USER_ROLES.KYC_REVIEWER,
  [ROLE_KEYS.COMMUNITY_MODERATOR]: USER_ROLES.COMMUNITY_MODERATOR,
  [ROLE_KEYS.DISPUTE_RESOLVER]: USER_ROLES.DISPUTE_RESOLVER,
  [ROLE_KEYS.SUPER_ADMIN]: USER_ROLES.SUPER_ADMIN,
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.STANDARD_USER]: 'Standard User',
  [USER_ROLES.KYC_REVIEWER]: 'KYC Reviewer',
  [USER_ROLES.COMMUNITY_MODERATOR]: 'Community Moderator',
  [USER_ROLES.DISPUTE_RESOLVER]: 'Dispute Resolver',
  [USER_ROLES.SUPER_ADMIN]: 'Super Admin',
}

const roleValues = Object.values(USER_ROLES) as number[]

function isRolesObject(value: unknown): value is UserRoles {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function normalizeRole(role?: number | string): UserRole {
  const numericRole = Number(role)
  if (roleValues.includes(numericRole)) return numericRole as UserRole
  if (String(role).toLowerCase() === 'admin') return USER_ROLES.SUPER_ADMIN
  return USER_ROLES.STANDARD_USER
}

export function roleKeyForCode(role?: number | string): RoleKey {
  const normalized = normalizeRole(role)
  const found = Object.entries(ROLE_CODES_BY_KEY).find(([, roleCode]) => roleCode === normalized)
  return (found?.[0] as RoleKey | undefined) || ROLE_KEYS.STANDARD_USER
}

export function normalizeRoles(roles?: UserRoles | number | string | null, legacyRole?: number | string): UserRoles {
  const normalized: UserRoles = { [ROLE_KEYS.STANDARD_USER]: USER_ROLES.STANDARD_USER }

  if (isRolesObject(roles)) {
    Object.entries(roles).forEach(([roleKey, roleCode]) => {
      if (!(roleKey in ROLE_CODES_BY_KEY)) return
      const expectedCode = ROLE_CODES_BY_KEY[roleKey as RoleKey]
      if (normalizeRole(roleCode) === expectedCode) normalized[roleKey as RoleKey] = expectedCode
    })
  } else if (roles !== undefined && roles !== null) {
    const legacyCode = normalizeRole(roles)
    normalized[roleKeyForCode(legacyCode)] = legacyCode
  }

  if (legacyRole !== undefined && legacyRole !== null) {
    const legacyCode = normalizeRole(legacyRole)
    normalized[roleKeyForCode(legacyCode)] = legacyCode
  }

  return normalized
}

export function roleLabel(role?: number | string) {
  return ROLE_LABELS[normalizeRole(role)]
}

export function roleLabels(roles?: UserRoles | number | string | null, legacyRole?: number | string) {
  return Object.values(normalizeRoles(roles, legacyRole)).map(roleLabel)
}

export function isStaffRole(roles?: UserRoles | number | string | null, legacyRole?: number | string) {
  return roleLabels(roles, legacyRole).some((label) => label !== ROLE_LABELS[USER_ROLES.STANDARD_USER])
}
