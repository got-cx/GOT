import type { SolidityHooks } from "hardhat/types/hooks";

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

interface ContractArtifact {
  abi: unknown[];
  contractName: string;
  sourceName: string;
}

const ABI_DIRECTORY = "abi";
const MANIFEST_FILE = "manifest.json";
const PUBLIC_SOURCE_PREFIXES = ["contracts/core/", "contracts/periphery/"];
const EXCLUDED_SOURCE_SEGMENTS = ["/libraries/"];

function isContractArtifact(value: unknown): value is ContractArtifact {
  if (typeof value !== "object" || value === null) return false;

  const artifact = value as Partial<ContractArtifact>;
  return (
    Array.isArray(artifact.abi) && typeof artifact.contractName === "string" && typeof artifact.sourceName === "string"
  );
}

function isPublicSource(sourceName: string): boolean {
  return (
    PUBLIC_SOURCE_PREFIXES.some((prefix) => sourceName.startsWith(prefix)) &&
    !EXCLUDED_SOURCE_SEGMENTS.some((segment) => sourceName.includes(segment))
  );
}

export default async (): Promise<Partial<SolidityHooks>> => ({
  processArtifactsAfterSuccessfulBuild: async (context, artifactPaths) => {
    const exports = new Map<string, ContractArtifact>();

    for (const artifactPath of artifactPaths) {
      if (!artifactPath.endsWith(".json")) continue;

      const artifact: unknown = JSON.parse(await readFile(artifactPath, "utf8"));
      if (!isContractArtifact(artifact) || !isPublicSource(artifact.sourceName)) continue;

      const existing = exports.get(artifact.contractName);
      if (existing !== undefined && existing.sourceName !== artifact.sourceName) {
        throw new Error(
          `Cannot export duplicate contract name ${artifact.contractName}: ` +
            `${existing.sourceName} and ${artifact.sourceName}`,
        );
      }

      exports.set(artifact.contractName, artifact);
    }

    const sortedExports = [...exports.values()].sort((left, right) =>
      left.contractName.localeCompare(right.contractName),
    );
    const abiDirectory = path.join(context.config.paths.root, ABI_DIRECTORY);
    await mkdir(abiDirectory, { recursive: true });

    const generatedFiles = new Set(sortedExports.map(({ contractName }) => `${contractName}.json`));
    generatedFiles.add(MANIFEST_FILE);

    for (const entry of await readdir(abiDirectory, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".json") && !generatedFiles.has(entry.name)) {
        await rm(path.join(abiDirectory, entry.name));
      }
    }

    await Promise.all(
      sortedExports.map(({ abi, contractName }) =>
        writeFile(path.join(abiDirectory, `${contractName}.json`), `${JSON.stringify(abi, null, 2)}\n`),
      ),
    );

    const manifest = Object.fromEntries(
      sortedExports.map(({ contractName, sourceName }) => [contractName, { abi: `${contractName}.json`, sourceName }]),
    );
    await writeFile(path.join(abiDirectory, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
  },
});
