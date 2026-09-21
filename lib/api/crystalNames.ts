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

export type CrystalNameProposalRow = {
  id: number;
  rawText: string;
  amharic: string;
  romanized: string;
  english: string;
  crystalLabel: string;
  status: string;
  source: string;
  HotelName?: string | null;
  tinNumber?: string | null;
  proposedBy?: string | null;
  mergedIntoId?: number | null;
  reviewNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
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

export async function proposeCrystalName(input: {
  rawText: string;
  amharic?: string;
  romanized?: string;
  english?: string;
  source?: string;
}): Promise<CrystalNameProposalRow> {
  const mutation = `
    mutation ProposeCrystalName(
      $rawText: String!
      $amharic: String
      $romanized: String
      $english: String
      $source: String
    ) {
      proposeCrystalName(
        rawText: $rawText
        amharic: $amharic
        romanized: $romanized
        english: $english
        source: $source
      ) {
        id
        rawText
        amharic
        romanized
        english
        crystalLabel
        status
        source
        mergedIntoId
        reviewNote
      }
    }
  `;

  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      rawText: input.rawText.trim(),
      amharic: input.amharic?.trim() || null,
      romanized: input.romanized?.trim() || null,
      english: input.english?.trim() || null,
      source: input.source?.trim() || "other",
    },
  });

  if (response.data.errors?.length) {
    throw new Error(
      response.data.errors[0]?.message || "Failed to propose crystal name",
    );
  }

  return response.data.data.proposeCrystalName as CrystalNameProposalRow;
}
