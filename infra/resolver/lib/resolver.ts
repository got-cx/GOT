import {
  deriveIntentAddress,
  validateIntentConfig,
} from "@got-cx/protocol/intent";
import { getAddress, zeroAddress } from "viem";
import type {
  IntentSnapshot,
  ResolverCandidate,
  ResolverDependencies,
  ResolverResult,
} from "../types.js";
import { chunk } from "./utils.js";

function isAuthorized(
  candidate: ResolverCandidate,
  resolverAddress: `0x${string}`,
): boolean {
  const authorized = getAddress(candidate.config.authorizedResolver);
  return (
    authorized === zeroAddress || authorized === getAddress(resolverAddress)
  );
}

function validateCandidate(
  candidate: ResolverCandidate,
  resolverAddress: `0x${string}`,
): boolean {
  if (candidate.chainId !== 8453) return false;
  try {
    validateIntentConfig(candidate.config, candidate.chainId);
    return (
      deriveIntentAddress(candidate.config, candidate.chainId) ===
        getAddress(candidate.intentAddress) &&
      isAuthorized(candidate, resolverAddress)
    );
  } catch {
    return false;
  }
}

export function createResolver(dependencies: ResolverDependencies) {
  return async function run(): Promise<ResolverResult> {
    let loaded = 0;
    let valid = 0;
    let discovered = 0;
    let simulated = 0;
    let sent = 0;
    let succeeded = 0;
    let skipped = 0;
    let cursor: string | undefined;
    let transactionLimitReached = false;

    while (!transactionLimitReached) {
      const page = await dependencies.loadCandidates(cursor);
      loaded += page.candidates.length;
      const pageCandidates = page.candidates.filter((candidate) => {
        const accepted = validateCandidate(
          candidate,
          dependencies.resolverAddress,
        );
        if (accepted) valid += 1;
        else {
          skipped += 1;
          dependencies.log?.({
            candidate: candidate.id,
            decision: "invalid-or-unauthorized",
          });
        }
        return accepted;
      });

      for (const batch of chunk(pageCandidates, dependencies.lensBatchSize)) {
        const discoverySnapshots = await dependencies.readSnapshots(batch);
        const byAddress = new Map(
          discoverySnapshots.map((snapshot) => [
            snapshot.intentAddress.toLowerCase(),
            snapshot,
          ]),
        );
        const funded = batch.filter((candidate) => {
          const snapshot = byAddress.get(candidate.intentAddress.toLowerCase());
          const accepted = Boolean(
            snapshot &&
            snapshot.balance >= dependencies.minBalance &&
            snapshot.balance > 0n &&
            snapshot.effectiveOwner,
          );
          if (accepted) discovered += 1;
          else skipped += 1;
          return accepted;
        });

        for (const candidate of funded) {
          if (
            (dependencies.dryRun ? simulated : sent) >=
            dependencies.maxTransactions
          ) {
            transactionLimitReached = true;
            break;
          }
          try {
            if (!validateCandidate(candidate, dependencies.resolverAddress)) {
              skipped += 1;
              continue;
            }
            const [fresh] = await dependencies.readSnapshots([candidate]);
            if (
              !fresh ||
              fresh.balance <= 0n ||
              fresh.balance < dependencies.minBalance ||
              !fresh.effectiveOwner
            ) {
              dependencies.log?.({
                candidate: candidate.id,
                decision: "stale",
              });
              skipped += 1;
              continue;
            }
            const simulation = await dependencies.simulate(candidate, fresh);
            simulated += 1;
            const gasCost = simulation.gas * simulation.gasPrice;
            if (
              dependencies.maxGasCost !== undefined &&
              gasCost > dependencies.maxGasCost
            ) {
              dependencies.log?.({
                candidate: candidate.id,
                decision: "gas-limit",
                gasCost: gasCost.toString(),
              });
              skipped += 1;
              continue;
            }
            if (dependencies.dryRun) {
              dependencies.log?.({
                candidate: candidate.id,
                decision: "would-send",
                kind: simulation.kind,
                gasCost: gasCost.toString(),
              });
              continue;
            }
            const hash = await dependencies.send(candidate, fresh);
            sent += 1;
            const success = await dependencies.waitForReceipt(hash);
            if (success) succeeded += 1;
            else
              dependencies.log?.({
                candidate: candidate.id,
                decision: "receipt-failed",
                hash,
              });
          } catch (error) {
            skipped += 1;
            dependencies.log?.({
              candidate: candidate.id,
              decision: "execution-skipped",
              reason: error instanceof Error ? error.message : "unknown error",
            });
          }
        }
        if (
          (dependencies.dryRun ? simulated : sent) >=
          dependencies.maxTransactions
        )
          transactionLimitReached = true;
        if (transactionLimitReached) break;
      }

      if (transactionLimitReached || page.nextCursor === null) break;
      if (page.nextCursor === cursor)
        throw new Error("Resolver candidate pagination did not advance.");
      cursor = page.nextCursor;
    }

    return {
      loaded,
      valid,
      discovered,
      simulated,
      sent,
      succeeded,
      skipped,
      dryRun: dependencies.dryRun,
    };
  };
}
