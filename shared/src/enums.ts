export const TicketType = {
  TASK: 'TASK',
  BUG: 'BUG',
  STORY: 'STORY',
} as const;
export type TicketType = (typeof TicketType)[keyof typeof TicketType];

export const Priority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const Status = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
} as const;
export type Status = (typeof Status)[keyof typeof Status];

export const Role = {
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
