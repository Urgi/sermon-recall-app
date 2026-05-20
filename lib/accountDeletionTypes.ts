export type AccountDeletionPreview = {
  role: string;
  church_id: string | null;
  church_name: string | null;
  member_count: number;
  other_member_count: number;
  will_delete_church: boolean;
};

export const DELETE_CONFIRM_PHRASE = 'DELETE';

export function parseDeletionPreview(raw: unknown): AccountDeletionPreview | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    role: typeof o.role === 'string' ? o.role : 'member',
    church_id: typeof o.church_id === 'string' ? o.church_id : null,
    church_name: typeof o.church_name === 'string' ? o.church_name : null,
    member_count: typeof o.member_count === 'number' ? o.member_count : 0,
    other_member_count: typeof o.other_member_count === 'number' ? o.other_member_count : 0,
    will_delete_church: o.will_delete_church === true,
  };
}
