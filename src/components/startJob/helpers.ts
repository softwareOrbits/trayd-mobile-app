import { z } from 'zod';

export const START_JOB_TOTAL = 5;

export const PHOTO_UPLOAD_TIMEOUT_MS = 20_000;

export const EIRCODE_REGEX = /^[A-Za-z0-9]{3}\s?[A-Za-z0-9]{4}$/;

export const normalizeEircode = (raw: string): string => {
  const clean = raw.replace(/\s+/g, '').toUpperCase();
  return clean.length === 7 ? `${clean.slice(0, 3)} ${clean.slice(3)}` : clean;
};

export const customerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(6, 'Enter a valid phone'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  eircode: z
    .string()
    .min(1, 'Eircode is required')
    .regex(EIRCODE_REGEX, 'Enter a valid Eircode (e.g. V94 VCP8)'),
});

export type CustomerForm = z.infer<typeof customerSchema>;
