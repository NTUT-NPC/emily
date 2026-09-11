interface MetaroleMember {
  roles: {
    cache: {
      has: (roleId: string) => boolean;
      some: (predicate: (role: { id: string }) => boolean) => boolean;
    };
    add: (roleId: string) => Promise<unknown>;
    remove: (roleId: string) => Promise<unknown>;
  };
}

interface ReconcileMetaroleOptions {
  metaroleId: string;
  memberRoleIds: string[];
  fetchMembers: () => Promise<Iterable<MetaroleMember>>;
  markSynced: () => Promise<void>;
}

export async function reconcileMetaroleMembers({
  metaroleId,
  memberRoleIds,
  fetchMembers,
  markSynced,
}: ReconcileMetaroleOptions): Promise<void> {
  const members = await fetchMembers();
  const eligibleRoleIds = new Set(memberRoleIds);

  for (const member of members) {
    const hasMetarole = member.roles.cache.has(metaroleId);
    const isEligible = member.roles.cache.some((role) => eligibleRoleIds.has(role.id));
    if (isEligible && !hasMetarole) {
      await member.roles.add(metaroleId);
    } else if (!isEligible && hasMetarole) {
      await member.roles.remove(metaroleId);
    }
  }

  await markSynced();
}
