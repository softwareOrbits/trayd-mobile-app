import type { ChatMessage } from '@/types';

export const demoChat: ChatMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    text: 'Job resumed at **08:31**. Yesterday: 6h 10m · €22.30 materials.',
  },
  {
    id: 'm2',
    role: 'user',
    text: 'Receipt — Heat Merchants · €52.40',
  },
  {
    id: 'm3',
    role: 'assistant',
    text: 'Receipt logged. **Heat Merchants · 4 items · €52.40 incl. VAT**. Tap below if anything needs correcting.',
    caption: 'OCR · 4 items extracted',
    action: 'Review receipt',
  },
  {
    id: 'm4',
    role: 'user',
    text: 'Add ball valve + PTFE from the van',
  },
  {
    id: 'm5',
    role: 'assistant',
    text: 'Logged from van stock.',
    caption: '2 items · €19.70 added',
    items: [
      { label: 'Ball valve 22mm × 1', amount: '€18.50' },
      { label: 'PTFE tape × 1', amount: '€1.20' },
    ],
  },
  {
    id: 'm6',
    role: 'assistant',
    text: 'Out-of-scope reply example below ↓ — I can only help with your **current job**.',
  },
  {
    id: 'm7',
    role: 'user',
    text: 'What was my pay last month?',
  },
  {
    id: 'm8',
    role: 'assistant',
    text: 'I can only help with this job. For pay, check the **Pay** tab or ask your office.',
  },
];
