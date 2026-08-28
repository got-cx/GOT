import { readFile } from "node:fs/promises";

import { defineConfig, type Plugin } from "@wagmi/cli";
import { actions } from "@wagmi/cli/plugins";
import type { Abi, Address } from "viem";

import baseDeployment from "./deployments/base.json" with { type: "json" };

type AbiManifest = Record<string, { abi: string }>;

function getShortName(contractName: string, itemName?: string) {
  if (!itemName) return "";

  const suffixMatch = contractName.match(/([A-Z][a-z0-9]*)$/);
  const contractSuffix = suffixMatch?.[1];
  if (!contractSuffix) return itemName;

  const shortName = itemName.replace(new RegExp(`^${contractSuffix}(?=[A-Z]|$)`), "");
  return shortName || itemName;
}

const addressByContract = {
  GOTFactory: baseDeployment.contracts.gotFactory,
  GOTLens: baseDeployment.contracts.gotLens,
  GOTName: baseDeployment.contracts.gotName,
  GOTSubscription: baseDeployment.contracts.gotSubscription,
  ISpendPermissionManager: baseDeployment.dependencies.spendPermissionManager,
} as const;

async function readContracts() {
  const manifest = JSON.parse(await readFile(new URL("./abi/manifest.json", import.meta.url), "utf8")) as AbiManifest;

  return Promise.all(
    Object.entries(manifest)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(async ([name, entry]) => ({
        name,
        abi: JSON.parse(await readFile(new URL(`./abi/${entry.abi}`, import.meta.url), "utf8")) as Abi,
      })),
  );
}

function exactContractNames(): Plugin {
  return {
    name: "Exact protocol contract names",
    run({ contracts }) {
      for (const contract of contracts) {
        const exactNames = {
          abiName: `${contract.name}Abi`,
          addressName: `${contract.name}Address`,
          configName: `${contract.name}Config`,
        } as const;

        for (const key of ["abiName", "addressName", "configName"] as const) {
          const generatedName = contract.meta[key];
          if (!generatedName) continue;

          const exactName = exactNames[key];
          contract.content = contract.content.replaceAll(generatedName, exactName);
          contract.meta[key] = exactName;
        }
      }

      return { content: "" };
    },
  };
}

export default defineConfig(async () => {
  const protocolContracts = await readContracts();
  const exactNameByNormalizedName = new Map(protocolContracts.map(({ name }) => [name.toLowerCase(), name]));

  return {
    out: "sdk/wagmi.ts",
    contracts: protocolContracts.map(({ name, abi }) => ({
      name,
      abi,
      ...(name in addressByContract
        ? {
            address: {
              [baseDeployment.chainId]: addressByContract[name as keyof typeof addressByContract] as Address,
            },
          }
        : {}),
    })),
    plugins: [
      exactContractNames(),
      actions({
        overridePackageName: "@wagmi/core",
        getActionName({ contractName, itemName, type }) {
          const exactContractName = exactNameByNormalizedName.get(contractName.toLowerCase()) ?? contractName;
          const actionName = `${type}${exactContractName}${getShortName(exactContractName, itemName)}`;
          return type === "watch" ? `${actionName}Event` : actionName;
        },
      }),
    ],
  };
});
