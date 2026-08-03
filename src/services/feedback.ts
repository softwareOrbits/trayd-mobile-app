import { Platform } from 'react-native';

import { supabase } from './supabase';
import { getMyMemberRef } from './member';

export type FeedbackKind = 'bug' | 'feature';

export async function sendFeedback(
  kind: FeedbackKind,
  description: string,
): Promise<void> {
  const me = await getMyMemberRef();
  const { error } = await supabase.from('feedback').insert({
    business_id: me.businessId,
    kind,
    description: description.trim(),
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });
  if (error) throw new Error(error.message);
}
