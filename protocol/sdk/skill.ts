#!/usr/bin/env node

import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, encodeFunctionData, getAddress, http, type Abi, type Address } from "viem";

import { deriveNameKeyV1, normalizeGOTIdentity } from "./nameKeys.js";

type ContractKind = "factory" | "intent" | "name" | "subscription";

type Deployment = {
  chainId: number;
  chainKey: string;
  network: string;
  contracts: {
    gotFactory: Address;
    gotIntent: Address;
    gotName: Address;
    gotSubscription: Address;
  };
};

const abiFiles = {
  factory: "GOTFactory.json",
  intent: "GOTIntent.json",
  name: "GOTName.json",
  subscription: "GOTSubscription.json",
} as const satisfies Record<ContractKind, string>;

const deploymentKeys = {
  factory: "gotFactory",
  intent: "gotIntent",
  name: "gotName",
  subscription: "gotSubscription",
} as const satisfies Record<ContractKind, keyof Deployment["contracts"]>;

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

function usage(exitCode = 0): never {
  const output = [
    "Usage:",
    "  got-protocol install [project-directory]",
    "  got-protocol deployments [chainId]",
    "  got-protocol abi factory|intent|name|subscription",
    "  got-protocol name-key <namespace> <identifier>",
    "  got-protocol encode factory|intent|name|subscription <functionName> <jsonArgs>",
    "  got-protocol read <chainId> factory|intent|name|subscription <address|deployment> <functionName> <jsonArgs> [rpcUrl]",
    "",
    "Examples:",
    "  got-protocol deployments 8453",
    "  got-protocol name-key got @alice",
    "  got-protocol encode factory quoteOwnerAmount '[1000000,30]'",
    "  got-protocol read 8453 factory deployment TREASURY '[]'",
    "",
    "Reads use rpcUrl, GOT_RPC_URL, BASE_RPC_URL, or https://mainnet.base.org.",
    "Encode returns unsigned calldata; it never signs or broadcasts transactions.",
  ].join("\n");

  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${output}\n`);
  process.exit(exitCode);
}

function json(value: unknown): string {
  return JSON.stringify(
    value,
    (_, nestedValue: unknown) => (typeof nestedValue === "bigint" ? nestedValue.toString() : nestedValue),
    2,
  );
}

function parseJsonArgs(raw: string | undefined): readonly unknown[] {
  if (raw === undefined) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("jsonArgs must be a JSON array");
  return parsed;
}

function parseContractKind(raw: string | undefined): ContractKind {
  if (raw !== undefined && raw in abiFiles) return raw as ContractKind;
  throw new Error("Contract kind must be factory, intent, name, or subscription");
}

async function getAbi(kind: ContractKind): Promise<Abi> {
  const contents = await readFile(path.join(packageRoot, "abi", abiFiles[kind]), "utf8");
  return JSON.parse(contents) as Abi;
}

async function loadDeployments(): Promise<Record<number, Deployment>> {
  const contents = await readFile(path.join(packageRoot, "deployments", "base.json"), "utf8");
  const deployment = JSON.parse(contents) as Deployment;
  return { [deployment.chainId]: deployment };
}

async function getDeployment(chainIdRaw: string | undefined): Promise<Deployment> {
  const chainId = Number(chainIdRaw);
  const deployments = await loadDeployments();
  const deployment = deployments[chainId];
  if (deployment !== undefined) return deployment;

  throw new Error(`Unsupported chainId ${chainIdRaw}. Supported: ${Object.keys(deployments).join(", ")}`);
}

function resolveAddress(deployment: Deployment, kind: ContractKind, target: string): Address {
  if (target !== "deployment") return getAddress(target);
  if (kind === "intent") {
    throw new Error(
      "Intent calls require an explicit clone address; the deployment address is the shared implementation",
    );
  }
  return getAddress(deployment.contracts[deploymentKeys[kind]]);
}

async function commandInstall([projectDirectoryRaw]: string[]): Promise<void> {
  const projectDirectory = path.resolve(projectDirectoryRaw ?? process.cwd());
  const source = path.join(packageRoot, "SKILL.md");
  const destination = path.join(projectDirectory, ".agents", "skills", "got-protocol", "SKILL.md");

  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
  process.stdout.write(`Installed GOT Protocol skill at ${destination}\n`);
}

async function commandDeployments([chainIdRaw]: string[]): Promise<void> {
  if (chainIdRaw !== undefined) {
    process.stdout.write(`${json(await getDeployment(chainIdRaw))}\n`);
    return;
  }
  process.stdout.write(`${json(await loadDeployments())}\n`);
}

async function commandAbi([kindRaw]: string[]): Promise<void> {
  process.stdout.write(`${json(await getAbi(parseContractKind(kindRaw)))}\n`);
}

function commandNameKey([namespace, identifier]: string[]): void {
  if (namespace === undefined || identifier === undefined) usage(1);
  const canonicalIdentity = normalizeGOTIdentity(namespace, identifier);
  process.stdout.write(`${json({ canonicalIdentity, nameKey: deriveNameKeyV1(namespace, identifier) })}\n`);
}

async function commandEncode([kindRaw, functionName, rawArgs]: string[]): Promise<void> {
  if (functionName === undefined) usage(1);
  const kind = parseContractKind(kindRaw);
  const data = encodeFunctionData({
    abi: await getAbi(kind),
    functionName,
    args: parseJsonArgs(rawArgs),
  });
  process.stdout.write(`${json({ kind, functionName, data })}\n`);
}

async function commandRead([chainIdRaw, kindRaw, target, functionName, rawArgs, rpcUrl]: string[]): Promise<void> {
  if (target === undefined || functionName === undefined) usage(1);

  const deployment = await getDeployment(chainIdRaw);
  const kind = parseContractKind(kindRaw);
  const address = resolveAddress(deployment, kind, target);
  const resolvedRpcUrl = rpcUrl ?? process.env.GOT_RPC_URL ?? process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
  const client = createPublicClient({ transport: http(resolvedRpcUrl) });
  const rpcChainId = await client.getChainId();
  if (rpcChainId !== deployment.chainId) {
    throw new Error(`RPC chainId ${rpcChainId} does not match requested chainId ${deployment.chainId}`);
  }

  const result = await client.readContract({
    address,
    abi: await getAbi(kind),
    functionName,
    args: parseJsonArgs(rawArgs),
  });

  process.stdout.write(
    `${json({ chainId: deployment.chainId, network: deployment.network, kind, address, functionName, result })}\n`,
  );
}

const [command, ...args] = process.argv.slice(2);

try {
  switch (command) {
    case undefined:
    case "install":
      await commandInstall(args);
      break;
    case "deployments":
      await commandDeployments(args);
      break;
    case "abi":
      await commandAbi(args);
      break;
    case "name-key":
      commandNameKey(args);
      break;
    case "encode":
      await commandEncode(args);
      break;
    case "read":
      await commandRead(args);
      break;
    case "help":
    case "--help":
    case "-h":
      usage(0);
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
