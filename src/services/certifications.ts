import { supabase } from './supabase';
import { getMyMemberRef } from './member';
import { base64ToUint8Array } from '@/utils/base64';
import { imageExtFromType, imageMimeFromType } from '@/utils/image';
import { uuidv4 } from '@/utils/uuid';

const CERT_BUCKET = 'certifications';

export type CertStatus = 'valid' | 'expiring' | 'expired' | 'no_expiry';

export type MemberCertification = {
  id: string;
  typeId: string | null;
  typeName: string;
  issuingBody: string | null;
  certNumber: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  documentPath: string | null;
  note: string | null;
  status: CertStatus;
};

export type CertificationType = {
  id: string;
  name: string;
  issuingBody: string | null;
  isMandatory: boolean;
};

export const statusOf = (expiresOn: string | null): CertStatus => {
  if (!expiresOn) return 'no_expiry';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(`${expiresOn}T00:00:00`);
  const days = Math.round((exp.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'valid';
};

export const daysToExpiry = (expiresOn: string | null): number | null => {
  if (!expiresOn) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(`${expiresOn}T00:00:00`);
  return Math.round((exp.getTime() - today.getTime()) / 86_400_000);
};

type TypeJoin =
  | { name: string; issuing_body: string | null }
  | { name: string; issuing_body: string | null }[]
  | null;

type MemberCertRow = {
  id: string;
  certification_type_id: string | null;
  cert_number: string | null;
  issued_on: string | null;
  expires_on: string | null;
  document_path: string | null;
  note: string | null;
  certification_types: TypeJoin;
};

const typeOf = (r: MemberCertRow) => {
  const t = Array.isArray(r.certification_types)
    ? r.certification_types[0]
    : r.certification_types;
  return {
    name: t?.name ?? 'Certification',
    issuingBody: t?.issuing_body ?? null,
  };
};

export async function fetchMyCertifications(): Promise<MemberCertification[]> {
  const me = await getMyMemberRef();
  const { data, error } = await supabase
    .from('member_certifications')
    .select(
      'id, certification_type_id, cert_number, issued_on, expires_on, document_path, note, certification_types(name, issuing_body)',
    )
    .eq('business_member_id', me.id)
    .order('expires_on', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as MemberCertRow[]).map(r => {
    const t = typeOf(r);
    return {
      id: r.id,
      typeId: r.certification_type_id,
      typeName: t.name,
      issuingBody: t.issuingBody,
      certNumber: r.cert_number,
      issuedOn: r.issued_on,
      expiresOn: r.expires_on,
      documentPath: r.document_path,
      note: r.note,
      status: statusOf(r.expires_on),
    };
  });
}

type CertTypeRow = {
  id: string;
  name: string;
  issuing_body: string | null;
  is_mandatory: boolean | null;
};

export async function fetchCertificationTypes(): Promise<CertificationType[]> {
  const me = await getMyMemberRef();
  const { data, error } = await supabase
    .from('certification_types')
    .select('id, name, issuing_body, is_mandatory')
    .eq('business_id', me.businessId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as CertTypeRow[]).map(t => ({
    id: t.id,
    name: t.name,
    issuingBody: t.issuing_body,
    isMandatory: t.is_mandatory === true,
  }));
}

export async function addCertification(input: {
  certificationTypeId: string;
  certNumber?: string | null;
  issuedOn?: string | null;
  expiresOn?: string | null;
  documentPath?: string | null;
}): Promise<string> {
  const me = await getMyMemberRef();
  const { data, error } = await supabase
    .from('member_certifications')
    .insert({
      business_id: me.businessId,
      business_member_id: me.id,
      certification_type_id: input.certificationTypeId,
      cert_number: input.certNumber || null,
      issued_on: input.issuedOn || null,
      expires_on: input.expiresOn || null,
      document_path: input.documentPath || null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateCertification(input: {
  id: string;
  certificationTypeId: string;
  certNumber?: string | null;
  issuedOn?: string | null;
  expiresOn?: string | null;
  documentPath?: string | null;
}): Promise<void> {
  const me = await getMyMemberRef();
  const { error } = await supabase
    .from('member_certifications')
    .update({
      certification_type_id: input.certificationTypeId,
      cert_number: input.certNumber || null,
      issued_on: input.issuedOn || null,
      expires_on: input.expiresOn || null,
      document_path: input.documentPath || null,
    })
    .eq('id', input.id)
    .eq('business_member_id', me.id);
  if (error) throw new Error(error.message);
}

export async function uploadCertDocument(asset: {
  base64: string;
  type?: string | null;
}): Promise<string> {
  const me = await getMyMemberRef();
  const path = `${me.businessId}/${me.id}/${uuidv4()}.${imageExtFromType(
    asset.type,
  )}`;
  const { error } = await supabase.storage
    .from(CERT_BUCKET)
    .upload(path, base64ToUint8Array(asset.base64), {
      contentType: imageMimeFromType(asset.type),
      upsert: false,
    });
  if (error) throw new Error(error.message);
  return path;
}

export async function certDocumentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(CERT_BUCKET)
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}
