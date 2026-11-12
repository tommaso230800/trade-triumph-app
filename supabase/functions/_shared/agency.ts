// Agency data are stored under the agency owner's user_id; every active member
// works on the same records. Non-members keep their own id (no shared access).
// deno-lint-ignore no-explicit-any
export async function resolveDataOwner(admin: any, userId: string): Promise<string> {
  const { data, error } = await admin.rpc('agency_data_owner', { _uid: userId });
  if (error) throw new Error(`Agency owner lookup failed: ${error.message}`);
  return (data as string | null) ?? userId;
}
