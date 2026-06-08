import type { IconName } from '@/types';

export type MockCustomer = {
  id: string;
  name: string;
  address: string;
  phone: string;
  meta: string;
};

export type MockCrew = {
  id: string;
  name: string;
  role: string;
  you?: boolean;
};

export type JobTypeOption = {
  key: 'standard' | 'quote' | 'callout';
  icon: IconName;
  title: string;
  subtitle: string;
};

/** Nearest-by-GPS suggestion shown at the top of step 1. */
export const NEAREST_CUSTOMER: MockCustomer = {
  id: 'cust-murphy',
  name: 'John Murphy',
  address: 'Adare, Co. Limerick · V94 X2P1',
  phone: '+353 87 444 1209',
  meta: '42 m away · 4 prior jobs',
};

export const RECENT_CUSTOMERS: MockCustomer[] = [
  {
    id: 'cust-doyle',
    name: 'Doyle — Tipperary',
    address: 'Tipperary',
    phone: '+353 87 111 2233',
    meta: 'V94 P3R8 · last Mon',
  },
  {
    id: 'cust-obrien',
    name: "O'Brien — Adare",
    address: 'Adare',
    phone: '+353 87 222 3344',
    meta: 'V94 K1M2 · last Sun',
  },
  {
    id: 'cust-conroy',
    name: 'Conroy — Limerick',
    address: 'Limerick',
    phone: '+353 87 333 4455',
    meta: 'V94 Y3R5 · 12 May',
  },
  {
    id: 'cust-hennessy',
    name: 'Hennessy — Newcastle',
    address: 'Newcastle',
    phone: '+353 87 444 5566',
    meta: 'V94 G3F8 · 8 May',
  },
];

export const JOB_TYPE_OPTIONS: JobTypeOption[] = [
  {
    key: 'standard',
    icon: 'construct',
    title: 'Standard',
    subtitle: 'Most jobs — labour + materials.',
  },
  {
    key: 'quote',
    icon: 'document-text-outline',
    title: 'Quote visit',
    subtitle: 'No materials — site photos + notes only.',
  },
  {
    key: 'callout',
    icon: 'flame',
    title: 'Emergency call-out',
    subtitle: 'Logged the same — surcharge applied.',
  },
];

export const CREW: MockCrew[] = [
  { id: 'crew-ciaran', name: "Ciarán O'Donnell", role: 'Lead plumber · you', you: true },
  { id: 'crew-padraig', name: 'Pádraig Walsh', role: 'Plumber' },
  { id: 'crew-sean', name: 'Seán Byrne', role: 'Apprentice' },
  { id: 'crew-aoife', name: 'Aoife Daly', role: 'Plumber' },
];

/**
 * Mock phone-dedup: typing this number on the New customer form triggers the
 * "Hold on — is this John?" screen.
 */
export const DEDUP_PHONE = NEAREST_CUSTOMER.phone;
export const DEDUP_MATCH = NEAREST_CUSTOMER;
