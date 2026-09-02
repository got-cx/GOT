import { createClient } from "@supabase/supabase-js";
import { getAddress } from "viem";
import type { ResolverConfig } from "../config.js";
import type {
  ResolverCandidate,
  ResolverCandidatePage,
  SerializedIntentConfig,
} from "../types.js";
import { deserializeIntentConfig } from "./utils.js";

export function createDatabaseAdapter(config: ResolverConfig) {
  const database = createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    async loadCandidates(cursor?: string): Promise<ResolverCandidatePage> {
      let query = database
        .from("addresses")
        .select("id, intent_address, intent_config, chain_id")
        .eq("chain_id", config.chainId)
        .is("archived_at", null)
        .order("id", { ascending: true })
        .limit(config.candidatePageSize);
      if (cursor) query = query.gt("id", cursor);

      const { data, error } = await query;
      if (error) throw new Error("Unable to load resolver candidates.");
      const rows = data ?? [];
      const candidates: ResolverCandidate[] = rows.map((row) => ({
        id: row.id as string,
        intentAddress: getAddress(row.intent_address as string),
        chainId: Number(row.chain_id),
        config: deserializeIntentConfig(
          row.intent_config as SerializedIntentConfig,
        ),
      }));
      return {
        candidates,
        nextCursor:
          rows.length === config.candidatePageSize
            ? (candidates.at(-1)?.id ?? null)
            : null,
      };
    },
  };
}
