export interface ApiKeyItem {
  id: string;
  label: string;
  masked_key: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyCreateInput {
  label: string;
  api_key: string;
}
