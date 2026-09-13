/* eslint-disable @typescript-eslint/no-explicit-any */
import { api, API_URL } from "./client";

export type CrystalNameRow = {
  id: number;
  amharic: string;
  romanized: string;
  english: string;
  crystalLabel: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchCrystalNames(options?: {
  search?: string;
  take?: number;
  skip?: number;
}): Promise<CrystalNameRow[]> {
  const query = `
    query CrystalNames($search: String, $take: Int, $skip: Int) {
      crystalNames(search: $search, take: $take, skip: $skip) {
        id
        amharic
        romanized
        english
        crystalLabel
      }
    }
  `;

  const response = await api.post(API_URL, {
    query,
    variables: {
      search: options?.search?.trim() || null,
      take: options?.take ?? 500,
      skip: options?.skip ?? 0,
    },
  });

  if (response.data.errors?.length) {
    throw new Error(
      response.data.errors[0]?.message || "Failed to load crystal names",
    );
  }

  return (response.data.data?.crystalNames || []) as CrystalNameRow[];
}
