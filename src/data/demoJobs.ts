import type { Job } from '@/types';

const iso = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

// date for a given weekday (0=Mon..6=Sun) in a week relative to the current one
const weekday = (weekOffset: number, dow: number) => {
  const d = new Date();
  const mondayIndex = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - mondayIndex + weekOffset * 7 + dow);
  return d.toISOString().slice(0, 10);
};

export const demoJobs: Job[] = [
  {
    id: 'demo-1',
    client: 'Doyle',
    region: 'Tipperary',
    postcode: 'V94 X2P1',
    service: 'Boiler service',
    status: 'scheduled',
    time: '14:00',
    scheduledDate: iso(0),
    coAssignedBy: 'Eile',
  },
  {
    id: 'demo-2',
    client: "O'Brien",
    region: 'Adare',
    postcode: 'V94 K1M2',
    service: 'Quote visit',
    status: 'quote',
    time: '10:30',
    scheduledDate: iso(0),
  },
  {
    id: 'demo-3',
    client: 'Conroy',
    region: 'Limerick',
    postcode: 'V94 Y3R5',
    service: 'Emergency call-out',
    status: 'scheduled',
    time: '08:00',
    scheduledDate: iso(1),
  },
  {
    id: 'demo-4',
    client: 'Murphy',
    region: 'Adare',
    postcode: 'V94 X2P1',
    service: 'Bathroom strip',
    status: 'live',
    time: '09:00',
    scheduledDate: iso(-1),
  },
  {
    id: 'demo-5',
    client: "O'Brien",
    region: 'Adare',
    postcode: 'V94 K1M2',
    service: 'Bathroom strip',
    status: 'paused',
    time: '09:30',
    scheduledDate: iso(-2),
  },
  {
    id: 'demo-6',
    client: 'Kelly',
    region: 'Limerick',
    postcode: 'V94 P1F3',
    service: 'Pipe repair',
    status: 'completed',
    time: '13:00',
    scheduledDate: weekday(0, 1),
    review: 'awaiting_review',
  },
  {
    id: 'demo-7',
    client: 'Brennan',
    region: 'Adare',
    postcode: 'V94 X8M2',
    service: 'Boiler service',
    status: 'completed',
    time: '10:00',
    scheduledDate: weekday(0, 0),
    review: 'approved',
  },
  {
    id: 'demo-8',
    client: 'Flynn',
    region: 'Limerick',
    postcode: 'V94 L5T2',
    service: 'Bathroom strip',
    status: 'completed',
    time: '15:00',
    scheduledDate: weekday(-1, 4),
    review: 'approved',
  },
  {
    id: 'demo-9',
    client: 'Hennessy',
    region: 'Newcastle',
    postcode: 'V94 G3F8',
    service: 'Emergency call-out',
    status: 'completed',
    time: '12:30',
    scheduledDate: weekday(-1, 3),
    review: 'approved',
  },
  {
    id: 'demo-10',
    client: "O'Sullivan",
    region: 'Galway',
    postcode: 'H91 Z9X4',
    service: 'Boiler install',
    status: 'completed',
    time: '09:15',
    scheduledDate: weekday(-1, 2),
    review: 'approved',
  },
  {
    id: 'demo-11',
    client: 'Walsh',
    region: 'Cork',
    postcode: 'T12 K2W8',
    service: 'Pipe replacement',
    status: 'completed',
    time: '16:00',
    scheduledDate: weekday(-1, 1),
    review: 'approved',
  },
];
