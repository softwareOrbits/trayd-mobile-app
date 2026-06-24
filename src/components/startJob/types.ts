export type NewCustomerPayload = {
  name: string;
  phone: string;
  email?: string | null;
  address: string;
  eircode: string;
};

export type PhotoAsset = { uri: string; base64?: string; type?: string | null };

export type CustomerMode = 'list' | 'new' | 'dedup';
