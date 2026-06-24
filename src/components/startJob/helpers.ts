import { z } from 'zod';

export const START_JOB_TOTAL = 5;

export const PHOTO_UPLOAD_TIMEOUT_MS = 20_000;

export const customerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(6, 'Enter a valid phone'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  eircode: z.string().min(1, 'Eircode is required'),
});

export type CustomerForm = z.infer<typeof customerSchema>;
