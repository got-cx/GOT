import { createClient } from "@supabase/supabase-js";
import { getAddress } from "viem";
import type { IndexerConfig } from "../config.js";
import type { TransferInsert } from "../types.js";
import { ADDRESS_QUERY_BATCH_SIZE, chunk } from "./utils.js";

export const TRANSFER_PROCESSED_STREAM = "transfer_processed";

export function createDatabaseAdapter(config: IndexerConfig) {
  const database = createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    async getCursor() {
      const { data, error } = await database
        .from("indexer_cursors")
        .select("last_scanned_block")
        .eq("chain_id", config.chainId)
        .eq("stream", TRANSFER_PROCESSED_STREAM)
        .maybeSingle();
      if (error) throw new Error("Unable to load the transfer index cursor.");
      return data ? BigInt(data.last_scanned_block as string | number) : null;
    },
    async getManagedAddresses(addresses: `0x${string}`[]) {
      const pages = await Promise.all(
        chunk(addresses, ADDRESS_QUERY_BATCH_SIZE).map(async (batch) => {
          const { data, error } = await database
            .from("addresses")
            .select("id, intent_address")
            .eq("chain_id", config.chainId)
            .in(
              "intent_address",
              batch.map((address) => address.toLowerCase()),
            );
          if (error)
            throw new Error("Unable to load managed Intent Addresses.");
          return data ?? [];
        }),
      );
      return pages.flat().map((row) => ({
        id: row.id as string,
        intentAddress: getAddress(row.intent_address as string),
      }));
    },
    async upsertTransfers(rows: TransferInsert[]) {
      const { data, error } = await database
        .from("transfers")
        .upsert(
          rows.map((row) => ({
            address_id: row.addressId,
            chain_id: row.chainId,
            transaction_hash: row.transactionHash,
            log_index: row.logIndex,
            block_number: row.blockNumber,
            block_hash: row.blockHash,
            block_timestamp: row.blockTimestamp,
            executor: row.executor,
            effective_owner: row.effectiveOwner,
            partner: row.partner,
            processed_amount: row.processedAmount,
            owner_amount: row.ownerAmount,
            treasury_fee: row.treasuryFee,
            partner_reward: row.partnerReward,
            execution_reward: row.executionReward,
            total_processed: row.totalProcessed,
          })),
          {
            onConflict: "chain_id,transaction_hash,log_index",
            ignoreDuplicates: true,
          },
        )
        .select("id");
      if (error) throw new Error("Unable to persist indexed transfers.");
      return data?.length ?? 0;
    },
    async advanceCursor(blockNumber: bigint) {
      const { error } = await database.rpc("advance_indexer_cursor", {
        p_chain_id: config.chainId,
        p_stream: TRANSFER_PROCESSED_STREAM,
        p_last_scanned_block: blockNumber.toString(),
      });
      if (error)
        throw new Error("Unable to advance the transfer index cursor.");
    },
  };
}
