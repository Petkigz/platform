/** Configuration hints only: they cannot prove that a scheduler runs or an email arrives. */
export function safeguardingReadiness(input: {
  providerConfigured: boolean;
  schedulerSecretConfigured: boolean;
  serviceRoleConfigured: boolean;
  notificationsEnabled: boolean | null;
  ownerEmailVerified: boolean;
}): string[] {
  const notes: string[] = [];
  if (!input.providerConfigured) notes.push('Email provider settings are missing or invalid on this server.');
  if (!input.schedulerSecretConfigured) notes.push('The scheduler secret is missing on this server.');
  if (!input.serviceRoleConfigured) notes.push('The server service role is not configured for alert dispatch.');
  if (input.notificationsEnabled === null) notes.push('The notifications switch could not be checked.');
  else if (!input.notificationsEnabled) notes.push('The notifications switch is off.');
  if (!input.ownerEmailVerified) notes.push('The signed-in owner email is missing or unverified.');
  notes.push('These checks cannot confirm the scheduler is running, provider credentials work, or an email was delivered. Check the private alert status and test delivery.');
  return notes;
}
