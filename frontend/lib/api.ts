import type { SQLDataType } from "@/types/canvas";
import type { ApiKeyItem, ApiKeyCreateInput } from "@/types/settings";

export interface AIGeneratedField {
  name: string;
  dataType: SQLDataType;
  isPrimaryKey?: boolean;
  isNullable?: boolean;
  isUnique?: boolean;
  defaultValue?: string;
}

export interface AIGeneratedEntity {
  name: string;
  fields: AIGeneratedField[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function generateEntityWithAI(prompt: string): Promise<AIGeneratedEntity> {
  const response = await fetch(`${API_BASE_URL}/ai/generate-entity`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    let errorMsg = "Failed to generate entity with AI";
    try {
      const errData = await response.json();
      if (errData?.detail?.message) {
        errorMsg = errData.detail.message;
      } else if (errData?.error?.message) {
        errorMsg = errData.error.message;
      }
    } catch {
      // Fallback
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return {
    name: data.name,
    fields: data.fields.map((f: any) => ({
      name: f.name,
      dataType: f.data_type,
      isPrimaryKey: f.is_primary_key,
      isNullable: f.is_nullable,
      isUnique: f.is_unique,
      defaultValue: f.default_value,
    })),
  };
}

export async function getApiKeys(): Promise<ApiKeyItem[]> {
  const response = await fetch(`${API_BASE_URL}/keys`);
  if (!response.ok) {
    throw new Error("Failed to fetch API keys");
  }
  return response.json();
}

export async function createApiKey(input: ApiKeyCreateInput): Promise<ApiKeyItem> {
  const response = await fetch(`${API_BASE_URL}/keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errMsg = "Failed to save API key";
    try {
      const err = await response.json();
      if (err?.detail) errMsg = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
    } catch {}
    throw new Error(errMsg);
  }

  return response.json();
}

export async function deleteApiKey(keyId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/keys/${keyId}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 404) {
    throw new Error("Failed to delete API key");
  }
}

export async function reorderApiKeys(keyIds: string[]): Promise<ApiKeyItem[]> {
  const response = await fetch(`${API_BASE_URL}/keys/reorder`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ key_ids: keyIds }),
  });

  if (!response.ok) {
    throw new Error("Failed to reorder API keys");
  }

  return response.json();
}
