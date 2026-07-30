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
