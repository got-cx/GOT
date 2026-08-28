import {
  createReadContract,
  createWriteContract,
  createSimulateContract,
  createWatchContractEvent,
} from '@wagmi/core/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GOTFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const GOTFactoryAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'implementation_', internalType: 'address', type: 'address' },
      { name: 'treasury_', internalType: 'address', type: 'address' },
      { name: 'executionShareBps_', internalType: 'uint16', type: 'uint16' },
      { name: 'partnerShareBps_', internalType: 'uint16', type: 'uint16' },
      { name: 'maxFeeBps_', internalType: 'uint16', type: 'uint16' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'error', inputs: [], name: 'CloneArgumentsTooLong' },
  { type: 'error', inputs: [], name: 'Create2EmptyBytecode' },
  { type: 'error', inputs: [], name: 'FailedDeployment' },
  {
    type: 'error',
    inputs: [
      { name: 'balance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InsufficientBalance',
  },
  { type: 'error', inputs: [], name: 'InvalidConfiguration' },
  { type: 'error', inputs: [], name: 'InvalidToken' },
  { type: 'error', inputs: [], name: 'UnexpectedDeploymentAddress' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'configHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'intentAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'executor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'IntentDeployed',
  },
  {
    type: 'function',
    inputs: [],
    name: 'EXECUTION_SHARE_BPS',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'IMMUTABLE_ARGS_LENGTH',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'IMPLEMENTATION',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_FEE_BPS',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PARTNER_SHARE_BPS',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROTOCOL_VERSION',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'TREASURY',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'config',
        internalType: 'struct IGOTFactory.IntentConfig',
        type: 'tuple',
        components: [
          { name: 'intentId', internalType: 'bytes32', type: 'bytes32' },
          { name: 'ownerSource', internalType: 'address', type: 'address' },
          { name: 'ownerKey', internalType: 'bytes32', type: 'bytes32' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'partner', internalType: 'address', type: 'address' },
          {
            name: 'authorizedResolver',
            internalType: 'address',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint128', type: 'uint128' },
          { name: 'initialDeadline', internalType: 'uint64', type: 'uint64' },
          { name: 'period', internalType: 'uint32', type: 'uint32' },
          { name: 'feeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'metadataHash', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
    ],
    name: 'configHash',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'config',
        internalType: 'struct IGOTFactory.IntentConfig',
        type: 'tuple',
        components: [
          { name: 'intentId', internalType: 'bytes32', type: 'bytes32' },
          { name: 'ownerSource', internalType: 'address', type: 'address' },
          { name: 'ownerKey', internalType: 'bytes32', type: 'bytes32' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'partner', internalType: 'address', type: 'address' },
          {
            name: 'authorizedResolver',
            internalType: 'address',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint128', type: 'uint128' },
          { name: 'initialDeadline', internalType: 'uint64', type: 'uint64' },
          { name: 'period', internalType: 'uint32', type: 'uint32' },
          { name: 'feeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'metadataHash', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
    ],
    name: 'deployAndExecute',
    outputs: [
      { name: 'intentAddress', internalType: 'address', type: 'address' },
      { name: 'processedAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'ownerAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'treasuryFee', internalType: 'uint256', type: 'uint256' },
      { name: 'partnerReward', internalType: 'uint256', type: 'uint256' },
      { name: 'executionReward', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'config',
        internalType: 'struct IGOTFactory.IntentConfig',
        type: 'tuple',
        components: [
          { name: 'intentId', internalType: 'bytes32', type: 'bytes32' },
          { name: 'ownerSource', internalType: 'address', type: 'address' },
          { name: 'ownerKey', internalType: 'bytes32', type: 'bytes32' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'partner', internalType: 'address', type: 'address' },
          {
            name: 'authorizedResolver',
            internalType: 'address',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint128', type: 'uint128' },
          { name: 'initialDeadline', internalType: 'uint64', type: 'uint64' },
          { name: 'period', internalType: 'uint32', type: 'uint32' },
          { name: 'feeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'metadataHash', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
    ],
    name: 'previewAddress',
    outputs: [
      { name: 'intentAddress', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'recipientAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'feeBps_', internalType: 'uint16', type: 'uint16' },
    ],
    name: 'quoteGrossAmount',
    outputs: [{ name: 'gross', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'grossAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'feeBps_', internalType: 'uint16', type: 'uint16' },
    ],
    name: 'quoteOwnerAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'pure',
  },
] as const

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const GOTFactoryAddress = {
  8453: '0x60700c99a58fD21022bf1f4d2b318C663e6F2E27',
} as const

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const GOTFactoryConfig = {
  address: GOTFactoryAddress,
  abi: GOTFactoryAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GOTIntent
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const GOTIntentAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'treasury_', internalType: 'address', type: 'address' },
      { name: 'executionShareBps_', internalType: 'uint16', type: 'uint16' },
      { name: 'partnerShareBps_', internalType: 'uint16', type: 'uint16' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'error', inputs: [], name: 'ConfiguredTokenNotRecoverable' },
  { type: 'error', inputs: [], name: 'DirectImplementationCall' },
  { type: 'error', inputs: [], name: 'InvalidAsset' },
  { type: 'error', inputs: [], name: 'InvalidConfiguration' },
  { type: 'error', inputs: [], name: 'InvalidExecutor' },
  { type: 'error', inputs: [], name: 'InvalidOwnerResolver' },
  { type: 'error', inputs: [], name: 'InvalidResolvedOwner' },
  { type: 'error', inputs: [], name: 'NativeTransferFailed' },
  { type: 'error', inputs: [], name: 'NoFundsAvailable' },
  { type: 'error', inputs: [], name: 'OwnerResolutionFailed' },
  { type: 'error', inputs: [], name: 'OwnerResolverUnavailable' },
  { type: 'error', inputs: [], name: 'OwnerUnresolved' },
  { type: 'error', inputs: [], name: 'ReentrantExecution' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  { type: 'error', inputs: [], name: 'TokenBalanceNotCleared' },
  { type: 'error', inputs: [], name: 'TotalProcessedOverflow' },
  { type: 'error', inputs: [], name: 'UnauthorizedFactory' },
  { type: 'error', inputs: [], name: 'UnauthorizedOwner' },
  { type: 'error', inputs: [], name: 'UnauthorizedResolver' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'asset',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'effectiveOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ERC20Recovered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'effectiveOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'NativeRecovered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'executor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'effectiveOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'partner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'processedAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'ownerAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'treasuryFee',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'partnerReward',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'executionReward',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'totalProcessed',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'TransferProcessed',
  },
  { type: 'fallback', stateMutability: 'payable' },
  {
    type: 'function',
    inputs: [],
    name: 'ERC165_GAS_LIMIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'EXECUTION_SHARE_BPS',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'IMMUTABLE_ARGS_LENGTH',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'OWNER_RESOLVER_GAS_LIMIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PARTNER_SHARE_BPS',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROTOCOL_VERSION',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'TREASURY',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'amount',
    outputs: [{ name: '', internalType: 'uint128', type: 'uint128' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'authorizedResolver',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'executor', internalType: 'address', type: 'address' }],
    name: 'executeFor',
    outputs: [
      { name: 'authorizedExecutor', internalType: 'address', type: 'address' },
      { name: 'effectiveOwner', internalType: 'address', type: 'address' },
      { name: 'processedAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'ownerAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'treasuryFee', internalType: 'uint256', type: 'uint256' },
      { name: 'partnerReward', internalType: 'uint256', type: 'uint256' },
      { name: 'executionReward', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'factory',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'feeBps',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'initialDeadline',
    outputs: [{ name: '', internalType: 'uint64', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'intentId',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'metadataHash',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ownerKey',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ownerSource',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'partner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'period',
    outputs: [{ name: '', internalType: 'uint32', type: 'uint32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'asset', internalType: 'address', type: 'address' }],
    name: 'recoverERC20',
    outputs: [
      { name: 'recoveredAmount', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'recoverNative',
    outputs: [
      { name: 'recoveredAmount', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'resolve',
    outputs: [
      { name: 'executor', internalType: 'address', type: 'address' },
      { name: 'effectiveOwner', internalType: 'address', type: 'address' },
      { name: 'processedAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'ownerAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'treasuryFee', internalType: 'uint256', type: 'uint256' },
      { name: 'partnerReward', internalType: 'uint256', type: 'uint256' },
      { name: 'executionReward', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'settle',
    outputs: [
      { name: 'executor', internalType: 'address', type: 'address' },
      { name: 'effectiveOwner', internalType: 'address', type: 'address' },
      { name: 'processedAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'ownerAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'treasuryFee', internalType: 'uint256', type: 'uint256' },
      { name: 'partnerReward', internalType: 'uint256', type: 'uint256' },
      { name: 'executionReward', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'token',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalProcessed',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  { type: 'receive', stateMutability: 'payable' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GOTLens
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x8226700c98f675a825cbfbabbc776171c474b113)
 */
export const GOTLensAbi = [
  {
    type: 'constructor',
    inputs: [{ name: 'gotFactory_', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  { type: 'error', inputs: [], name: 'InvalidFactory' },
  {
    type: 'function',
    inputs: [],
    name: 'ERC165_GAS_LIMIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ERC20_BALANCE_GAS_LIMIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'GOT_FACTORY',
    outputs: [
      { name: '', internalType: 'contract IGOTFactory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'INTENT_READ_GAS_LIMIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'OWNER_RESOLVER_GAS_LIMIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'config',
        internalType: 'struct IGOTFactory.IntentConfig',
        type: 'tuple',
        components: [
          { name: 'intentId', internalType: 'bytes32', type: 'bytes32' },
          { name: 'ownerSource', internalType: 'address', type: 'address' },
          { name: 'ownerKey', internalType: 'bytes32', type: 'bytes32' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'partner', internalType: 'address', type: 'address' },
          {
            name: 'authorizedResolver',
            internalType: 'address',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint128', type: 'uint128' },
          { name: 'initialDeadline', internalType: 'uint64', type: 'uint64' },
          { name: 'period', internalType: 'uint32', type: 'uint32' },
          { name: 'feeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'metadataHash', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
    ],
    name: 'snapshot',
    outputs: [
      {
        name: 'result',
        internalType: 'struct GOTLens.IntentSnapshot',
        type: 'tuple',
        components: [
          { name: 'intentAddress', internalType: 'address', type: 'address' },
          { name: 'configValid', internalType: 'bool', type: 'bool' },
          { name: 'deployed', internalType: 'bool', type: 'bool' },
          { name: 'canonical', internalType: 'bool', type: 'bool' },
          { name: 'balanceRead', internalType: 'bool', type: 'bool' },
          { name: 'balance', internalType: 'uint256', type: 'uint256' },
          { name: 'stateRead', internalType: 'bool', type: 'bool' },
          { name: 'totalProcessed', internalType: 'uint256', type: 'uint256' },
          { name: 'ownerResolved', internalType: 'bool', type: 'bool' },
          { name: 'effectiveOwner', internalType: 'address', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'configs',
        internalType: 'struct IGOTFactory.IntentConfig[]',
        type: 'tuple[]',
        components: [
          { name: 'intentId', internalType: 'bytes32', type: 'bytes32' },
          { name: 'ownerSource', internalType: 'address', type: 'address' },
          { name: 'ownerKey', internalType: 'bytes32', type: 'bytes32' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'partner', internalType: 'address', type: 'address' },
          {
            name: 'authorizedResolver',
            internalType: 'address',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint128', type: 'uint128' },
          { name: 'initialDeadline', internalType: 'uint64', type: 'uint64' },
          { name: 'period', internalType: 'uint32', type: 'uint32' },
          { name: 'feeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'metadataHash', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
    ],
    name: 'snapshotMany',
    outputs: [
      {
        name: 'results',
        internalType: 'struct GOTLens.IntentSnapshot[]',
        type: 'tuple[]',
        components: [
          { name: 'intentAddress', internalType: 'address', type: 'address' },
          { name: 'configValid', internalType: 'bool', type: 'bool' },
          { name: 'deployed', internalType: 'bool', type: 'bool' },
          { name: 'canonical', internalType: 'bool', type: 'bool' },
          { name: 'balanceRead', internalType: 'bool', type: 'bool' },
          { name: 'balance', internalType: 'uint256', type: 'uint256' },
          { name: 'stateRead', internalType: 'bool', type: 'bool' },
          { name: 'totalProcessed', internalType: 'uint256', type: 'uint256' },
          { name: 'ownerResolved', internalType: 'bool', type: 'bool' },
          { name: 'effectiveOwner', internalType: 'address', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x8226700c98f675a825cbfbabbc776171c474b113)
 */
export const GOTLensAddress = {
  8453: '0x8226700C98F675a825cBFBabBC776171c474b113',
} as const

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x8226700c98f675a825cbfbabbc776171c474b113)
 */
export const GOTLensConfig = {
  address: GOTLensAddress,
  abi: GOTLensAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GOTName
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const GOTNameAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'claimVerifier_', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'error', inputs: [], name: 'AlreadyClaimed' },
  { type: 'error', inputs: [], name: 'ClaimExpired' },
  { type: 'error', inputs: [], name: 'InvalidAccount' },
  { type: 'error', inputs: [], name: 'InvalidNameKey' },
  { type: 'error', inputs: [], name: 'InvalidShortString' },
  { type: 'error', inputs: [], name: 'InvalidVerifierSignature' },
  { type: 'error', inputs: [], name: 'NameNotClaimed' },
  { type: 'error', inputs: [], name: 'NoAccountChange' },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'error',
    inputs: [{ name: 'str', internalType: 'string', type: 'string' }],
    name: 'StringTooLong',
  },
  { type: 'error', inputs: [], name: 'Unauthorized' },
  { type: 'event', anonymous: false, inputs: [], name: 'EIP712DomainChanged' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'nameKey',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'NameClaimed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'nameKey',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'previousAccount',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newAccount',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'NameTransferred',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CLAIM_TYPEHASH',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CLAIM_VERIFIER',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'nameKey', internalType: 'bytes32', type: 'bytes32' }],
    name: 'accountOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'claimData',
        internalType: 'struct IGOTName.Claim',
        type: 'tuple',
        components: [
          { name: 'nameKey', internalType: 'bytes32', type: 'bytes32' },
          { name: 'account', internalType: 'address', type: 'address' },
          { name: 'deadline', internalType: 'uint48', type: 'uint48' },
        ],
      },
      { name: 'verifierSignature', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'canonicalIdentity', internalType: 'string', type: 'string' },
    ],
    name: 'deriveNameKey',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      { name: 'fields', internalType: 'bytes1', type: 'bytes1' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'version', internalType: 'string', type: 'string' },
      { name: 'chainId', internalType: 'uint256', type: 'uint256' },
      { name: 'verifyingContract', internalType: 'address', type: 'address' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
      { name: 'extensions', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: 'nameKey', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'resolveOwner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'nameKey', internalType: 'bytes32', type: 'bytes32' },
      { name: 'newAccount', internalType: 'address', type: 'address' },
    ],
    name: 'transfer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const GOTNameAddress = {
  8453: '0x68A0a95E22E289d4b852ed2ecE6fB3A54ac936Af',
} as const

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const GOTNameConfig = {
  address: GOTNameAddress,
  abi: GOTNameAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GOTSubscription
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1d7d3f702ccf67461b942c7a3f682cd9e7a28bb0)
 */
export const GOTSubscriptionAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'gotFactory_', internalType: 'address', type: 'address' },
      {
        name: 'spendPermissionManager_',
        internalType: 'address',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'error', inputs: [], name: 'IncorrectReceivedAmount' },
  { type: 'error', inputs: [], name: 'IncorrectResidualBalance' },
  { type: 'error', inputs: [], name: 'InvalidBinding' },
  { type: 'error', inputs: [], name: 'InvalidConfiguration' },
  { type: 'error', inputs: [], name: 'InvalidPermission' },
  { type: 'error', inputs: [], name: 'PermissionApprovalFailed' },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'intentId',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'subscriber',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'intent',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'executor',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'processedAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'ownerAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'treasuryFee',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'partnerReward',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'executionReward',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'SubscriptionTransferProcessed',
  },
  {
    type: 'function',
    inputs: [],
    name: 'BINDING_VERSION',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'GOT_FACTORY',
    outputs: [
      { name: '', internalType: 'contract IGOTFactory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'SPEND_PERMISSION_MANAGER',
    outputs: [
      {
        name: '',
        internalType: 'contract ISpendPermissionManager',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'permission',
        internalType: 'struct ISpendPermissionManager.SpendPermission',
        type: 'tuple',
        components: [
          { name: 'account', internalType: 'address', type: 'address' },
          { name: 'spender', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'allowance', internalType: 'uint160', type: 'uint160' },
          { name: 'period', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'end', internalType: 'uint48', type: 'uint48' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
          { name: 'extraData', internalType: 'bytes', type: 'bytes' },
        ],
      },
      { name: 'approvalSignature', internalType: 'bytes', type: 'bytes' },
      {
        name: 'config',
        internalType: 'struct IGOTFactory.IntentConfig',
        type: 'tuple',
        components: [
          { name: 'intentId', internalType: 'bytes32', type: 'bytes32' },
          { name: 'ownerSource', internalType: 'address', type: 'address' },
          { name: 'ownerKey', internalType: 'bytes32', type: 'bytes32' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'partner', internalType: 'address', type: 'address' },
          {
            name: 'authorizedResolver',
            internalType: 'address',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint128', type: 'uint128' },
          { name: 'initialDeadline', internalType: 'uint64', type: 'uint64' },
          { name: 'period', internalType: 'uint32', type: 'uint32' },
          { name: 'feeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'metadataHash', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
    ],
    name: 'execute',
    outputs: [
      { name: 'intent', internalType: 'address', type: 'address' },
      { name: 'processedAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'ownerAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'treasuryFee', internalType: 'uint256', type: 'uint256' },
      { name: 'partnerReward', internalType: 'uint256', type: 'uint256' },
      { name: 'executionReward', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1d7d3f702ccf67461b942c7a3f682cd9e7a28bb0)
 */
export const GOTSubscriptionAddress = {
  8453: '0x1d7d3F702CcF67461b942C7A3f682cd9E7a28bb0',
} as const

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1d7d3f702ccf67461b942c7a3f682cd9e7a28bb0)
 */
export const GOTSubscriptionConfig = {
  address: GOTSubscriptionAddress,
  abi: GOTSubscriptionAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IGOTFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const IGOTFactoryAbi = [
  {
    type: 'function',
    inputs: [
      {
        name: 'config',
        internalType: 'struct IGOTFactory.IntentConfig',
        type: 'tuple',
        components: [
          { name: 'intentId', internalType: 'bytes32', type: 'bytes32' },
          { name: 'ownerSource', internalType: 'address', type: 'address' },
          { name: 'ownerKey', internalType: 'bytes32', type: 'bytes32' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'partner', internalType: 'address', type: 'address' },
          {
            name: 'authorizedResolver',
            internalType: 'address',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint128', type: 'uint128' },
          { name: 'initialDeadline', internalType: 'uint64', type: 'uint64' },
          { name: 'period', internalType: 'uint32', type: 'uint32' },
          { name: 'feeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'metadataHash', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
    ],
    name: 'configHash',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'config',
        internalType: 'struct IGOTFactory.IntentConfig',
        type: 'tuple',
        components: [
          { name: 'intentId', internalType: 'bytes32', type: 'bytes32' },
          { name: 'ownerSource', internalType: 'address', type: 'address' },
          { name: 'ownerKey', internalType: 'bytes32', type: 'bytes32' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'partner', internalType: 'address', type: 'address' },
          {
            name: 'authorizedResolver',
            internalType: 'address',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint128', type: 'uint128' },
          { name: 'initialDeadline', internalType: 'uint64', type: 'uint64' },
          { name: 'period', internalType: 'uint32', type: 'uint32' },
          { name: 'feeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'metadataHash', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
    ],
    name: 'deployAndExecute',
    outputs: [
      { name: 'intentAddress', internalType: 'address', type: 'address' },
      { name: 'processedAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'ownerAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'treasuryFee', internalType: 'uint256', type: 'uint256' },
      { name: 'partnerReward', internalType: 'uint256', type: 'uint256' },
      { name: 'executionReward', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'config',
        internalType: 'struct IGOTFactory.IntentConfig',
        type: 'tuple',
        components: [
          { name: 'intentId', internalType: 'bytes32', type: 'bytes32' },
          { name: 'ownerSource', internalType: 'address', type: 'address' },
          { name: 'ownerKey', internalType: 'bytes32', type: 'bytes32' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'partner', internalType: 'address', type: 'address' },
          {
            name: 'authorizedResolver',
            internalType: 'address',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint128', type: 'uint128' },
          { name: 'initialDeadline', internalType: 'uint64', type: 'uint64' },
          { name: 'period', internalType: 'uint32', type: 'uint32' },
          { name: 'feeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'metadataHash', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
    ],
    name: 'previewAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'recipientAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'feeBps', internalType: 'uint16', type: 'uint16' },
    ],
    name: 'quoteGrossAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'grossAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'feeBps', internalType: 'uint16', type: 'uint16' },
    ],
    name: 'quoteOwnerAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'pure',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IGOTIntent
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const IGOTIntentAbi = [
  {
    type: 'function',
    inputs: [],
    name: 'amount',
    outputs: [{ name: '', internalType: 'uint128', type: 'uint128' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'authorizedResolver',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'executor', internalType: 'address', type: 'address' }],
    name: 'executeFor',
    outputs: [
      { name: 'authorizedExecutor', internalType: 'address', type: 'address' },
      { name: 'effectiveOwner', internalType: 'address', type: 'address' },
      { name: 'processedAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'ownerAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'treasuryFee', internalType: 'uint256', type: 'uint256' },
      { name: 'partnerReward', internalType: 'uint256', type: 'uint256' },
      { name: 'executionReward', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'factory',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'feeBps',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'initialDeadline',
    outputs: [{ name: '', internalType: 'uint64', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'intentId',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'metadataHash',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ownerKey',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ownerSource',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'partner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'period',
    outputs: [{ name: '', internalType: 'uint32', type: 'uint32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'asset', internalType: 'address', type: 'address' }],
    name: 'recoverERC20',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'recoverNative',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'resolve',
    outputs: [
      { name: 'executor', internalType: 'address', type: 'address' },
      { name: 'effectiveOwner', internalType: 'address', type: 'address' },
      { name: 'processedAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'ownerAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'treasuryFee', internalType: 'uint256', type: 'uint256' },
      { name: 'partnerReward', internalType: 'uint256', type: 'uint256' },
      { name: 'executionReward', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'settle',
    outputs: [
      { name: 'executor', internalType: 'address', type: 'address' },
      { name: 'effectiveOwner', internalType: 'address', type: 'address' },
      { name: 'processedAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'ownerAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'treasuryFee', internalType: 'uint256', type: 'uint256' },
      { name: 'partnerReward', internalType: 'uint256', type: 'uint256' },
      { name: 'executionReward', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'token',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalProcessed',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IGOTName
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const IGOTNameAbi = [
  {
    type: 'function',
    inputs: [{ name: 'nameKey', internalType: 'bytes32', type: 'bytes32' }],
    name: 'accountOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'claimData',
        internalType: 'struct IGOTName.Claim',
        type: 'tuple',
        components: [
          { name: 'nameKey', internalType: 'bytes32', type: 'bytes32' },
          { name: 'account', internalType: 'address', type: 'address' },
          { name: 'deadline', internalType: 'uint48', type: 'uint48' },
        ],
      },
      { name: 'verifierSignature', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'canonicalIdentity', internalType: 'string', type: 'string' },
    ],
    name: 'deriveNameKey',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'intent', internalType: 'address', type: 'address' },
      { name: 'ownerKey', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'resolveOwner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'nameKey', internalType: 'bytes32', type: 'bytes32' },
      { name: 'newAccount', internalType: 'address', type: 'address' },
    ],
    name: 'transfer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IGOTOwnerResolver
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const IGOTOwnerResolverAbi = [
  {
    type: 'function',
    inputs: [
      { name: 'intent', internalType: 'address', type: 'address' },
      { name: 'ownerKey', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'resolveOwner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ISpendPermissionManager
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xf85210B21cC50302F477BA56686d2019dC9b67Ad)
 */
export const ISpendPermissionManagerAbi = [
  {
    type: 'function',
    inputs: [
      {
        name: 'spendPermission',
        internalType: 'struct ISpendPermissionManager.SpendPermission',
        type: 'tuple',
        components: [
          { name: 'account', internalType: 'address', type: 'address' },
          { name: 'spender', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'allowance', internalType: 'uint160', type: 'uint160' },
          { name: 'period', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'end', internalType: 'uint48', type: 'uint48' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
          { name: 'extraData', internalType: 'bytes', type: 'bytes' },
        ],
      },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'approveWithSignature',
    outputs: [{ name: 'approved', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'spendPermission',
        internalType: 'struct ISpendPermissionManager.SpendPermission',
        type: 'tuple',
        components: [
          { name: 'account', internalType: 'address', type: 'address' },
          { name: 'spender', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'allowance', internalType: 'uint160', type: 'uint160' },
          { name: 'period', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'end', internalType: 'uint48', type: 'uint48' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
          { name: 'extraData', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'isApproved',
    outputs: [{ name: 'approved', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'spendPermission',
        internalType: 'struct ISpendPermissionManager.SpendPermission',
        type: 'tuple',
        components: [
          { name: 'account', internalType: 'address', type: 'address' },
          { name: 'spender', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'allowance', internalType: 'uint160', type: 'uint160' },
          { name: 'period', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'end', internalType: 'uint48', type: 'uint48' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
          { name: 'extraData', internalType: 'bytes', type: 'bytes' },
        ],
      },
      { name: 'value', internalType: 'uint160', type: 'uint160' },
    ],
    name: 'spend',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xf85210B21cC50302F477BA56686d2019dC9b67Ad)
 */
export const ISpendPermissionManagerAddress = {
  8453: '0xf85210B21cC50302F477BA56686d2019dC9b67Ad',
} as const

/**
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xf85210B21cC50302F477BA56686d2019dC9b67Ad)
 */
export const ISpendPermissionManagerConfig = {
  address: ISpendPermissionManagerAddress,
  abi: ISpendPermissionManagerAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTFactoryAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const readGOTFactory = /*#__PURE__*/ createReadContract({
  abi: GOTFactoryAbi,
  address: GOTFactoryAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTFactoryAbi}__ and `functionName` set to `"EXECUTION_SHARE_BPS"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const readGOTFactoryExecutionShareBps = /*#__PURE__*/ createReadContract(
  {
    abi: GOTFactoryAbi,
    address: GOTFactoryAddress,
    functionName: 'EXECUTION_SHARE_BPS',
  },
)

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTFactoryAbi}__ and `functionName` set to `"IMMUTABLE_ARGS_LENGTH"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const readGOTFactoryImmutableArgsLength =
  /*#__PURE__*/ createReadContract({
    abi: GOTFactoryAbi,
    address: GOTFactoryAddress,
    functionName: 'IMMUTABLE_ARGS_LENGTH',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTFactoryAbi}__ and `functionName` set to `"IMPLEMENTATION"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const readGOTFactoryImplementation = /*#__PURE__*/ createReadContract({
  abi: GOTFactoryAbi,
  address: GOTFactoryAddress,
  functionName: 'IMPLEMENTATION',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTFactoryAbi}__ and `functionName` set to `"MAX_FEE_BPS"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const readGOTFactoryMaxFeeBps = /*#__PURE__*/ createReadContract({
  abi: GOTFactoryAbi,
  address: GOTFactoryAddress,
  functionName: 'MAX_FEE_BPS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTFactoryAbi}__ and `functionName` set to `"PARTNER_SHARE_BPS"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const readGOTFactoryPartnerShareBps = /*#__PURE__*/ createReadContract({
  abi: GOTFactoryAbi,
  address: GOTFactoryAddress,
  functionName: 'PARTNER_SHARE_BPS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTFactoryAbi}__ and `functionName` set to `"PROTOCOL_VERSION"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const readGOTFactoryProtocolVersion = /*#__PURE__*/ createReadContract({
  abi: GOTFactoryAbi,
  address: GOTFactoryAddress,
  functionName: 'PROTOCOL_VERSION',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTFactoryAbi}__ and `functionName` set to `"TREASURY"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const readGOTFactoryTreasury = /*#__PURE__*/ createReadContract({
  abi: GOTFactoryAbi,
  address: GOTFactoryAddress,
  functionName: 'TREASURY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTFactoryAbi}__ and `functionName` set to `"configHash"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const readGOTFactoryConfigHash = /*#__PURE__*/ createReadContract({
  abi: GOTFactoryAbi,
  address: GOTFactoryAddress,
  functionName: 'configHash',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTFactoryAbi}__ and `functionName` set to `"previewAddress"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const readGOTFactoryPreviewAddress = /*#__PURE__*/ createReadContract({
  abi: GOTFactoryAbi,
  address: GOTFactoryAddress,
  functionName: 'previewAddress',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTFactoryAbi}__ and `functionName` set to `"quoteGrossAmount"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const readGOTFactoryQuoteGrossAmount = /*#__PURE__*/ createReadContract({
  abi: GOTFactoryAbi,
  address: GOTFactoryAddress,
  functionName: 'quoteGrossAmount',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTFactoryAbi}__ and `functionName` set to `"quoteOwnerAmount"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const readGOTFactoryQuoteOwnerAmount = /*#__PURE__*/ createReadContract({
  abi: GOTFactoryAbi,
  address: GOTFactoryAddress,
  functionName: 'quoteOwnerAmount',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link GOTFactoryAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const writeGOTFactory = /*#__PURE__*/ createWriteContract({
  abi: GOTFactoryAbi,
  address: GOTFactoryAddress,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link GOTFactoryAbi}__ and `functionName` set to `"deployAndExecute"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const writeGOTFactoryDeployAndExecute =
  /*#__PURE__*/ createWriteContract({
    abi: GOTFactoryAbi,
    address: GOTFactoryAddress,
    functionName: 'deployAndExecute',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link GOTFactoryAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const simulateGOTFactory = /*#__PURE__*/ createSimulateContract({
  abi: GOTFactoryAbi,
  address: GOTFactoryAddress,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link GOTFactoryAbi}__ and `functionName` set to `"deployAndExecute"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const simulateGOTFactoryDeployAndExecute =
  /*#__PURE__*/ createSimulateContract({
    abi: GOTFactoryAbi,
    address: GOTFactoryAddress,
    functionName: 'deployAndExecute',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link GOTFactoryAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const watchGOTFactoryEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: GOTFactoryAbi,
  address: GOTFactoryAddress,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link GOTFactoryAbi}__ and `eventName` set to `"IntentDeployed"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x60700c99a58fD21022bf1f4d2b318C663e6F2E27)
 */
export const watchGOTFactoryIntentDeployedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: GOTFactoryAbi,
    address: GOTFactoryAddress,
    eventName: 'IntentDeployed',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__
 */
export const readGOTIntent = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"ERC165_GAS_LIMIT"`
 */
export const readGOTIntentErc165GasLimit = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'ERC165_GAS_LIMIT',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"EXECUTION_SHARE_BPS"`
 */
export const readGOTIntentExecutionShareBps = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'EXECUTION_SHARE_BPS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"IMMUTABLE_ARGS_LENGTH"`
 */
export const readGOTIntentImmutableArgsLength =
  /*#__PURE__*/ createReadContract({
    abi: GOTIntentAbi,
    functionName: 'IMMUTABLE_ARGS_LENGTH',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"OWNER_RESOLVER_GAS_LIMIT"`
 */
export const readGOTIntentOwnerResolverGasLimit =
  /*#__PURE__*/ createReadContract({
    abi: GOTIntentAbi,
    functionName: 'OWNER_RESOLVER_GAS_LIMIT',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"PARTNER_SHARE_BPS"`
 */
export const readGOTIntentPartnerShareBps = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'PARTNER_SHARE_BPS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"PROTOCOL_VERSION"`
 */
export const readGOTIntentProtocolVersion = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'PROTOCOL_VERSION',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"TREASURY"`
 */
export const readGOTIntentTreasury = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'TREASURY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"amount"`
 */
export const readGOTIntentAmount = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'amount',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"authorizedResolver"`
 */
export const readGOTIntentAuthorizedResolver = /*#__PURE__*/ createReadContract(
  { abi: GOTIntentAbi, functionName: 'authorizedResolver' },
)

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"factory"`
 */
export const readGOTIntentFactory = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'factory',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"feeBps"`
 */
export const readGOTIntentFeeBps = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'feeBps',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"initialDeadline"`
 */
export const readGOTIntentInitialDeadline = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'initialDeadline',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"intentId"`
 */
export const readGOTIntentId = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'intentId',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"metadataHash"`
 */
export const readGOTIntentMetadataHash = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'metadataHash',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"owner"`
 */
export const readGOTIntentOwner = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'owner',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"ownerKey"`
 */
export const readGOTIntentOwnerKey = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'ownerKey',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"ownerSource"`
 */
export const readGOTIntentOwnerSource = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'ownerSource',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"partner"`
 */
export const readGOTIntentPartner = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'partner',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"period"`
 */
export const readGOTIntentPeriod = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'period',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"token"`
 */
export const readGOTIntentToken = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'token',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"totalProcessed"`
 */
export const readGOTIntentTotalProcessed = /*#__PURE__*/ createReadContract({
  abi: GOTIntentAbi,
  functionName: 'totalProcessed',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link GOTIntentAbi}__
 */
export const writeGOTIntent = /*#__PURE__*/ createWriteContract({
  abi: GOTIntentAbi,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"executeFor"`
 */
export const writeGOTIntentExecuteFor = /*#__PURE__*/ createWriteContract({
  abi: GOTIntentAbi,
  functionName: 'executeFor',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"recoverERC20"`
 */
export const writeGOTIntentRecoverErc20 = /*#__PURE__*/ createWriteContract({
  abi: GOTIntentAbi,
  functionName: 'recoverERC20',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"recoverNative"`
 */
export const writeGOTIntentRecoverNative = /*#__PURE__*/ createWriteContract({
  abi: GOTIntentAbi,
  functionName: 'recoverNative',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"resolve"`
 */
export const writeGOTIntentResolve = /*#__PURE__*/ createWriteContract({
  abi: GOTIntentAbi,
  functionName: 'resolve',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"settle"`
 */
export const writeGOTIntentSettle = /*#__PURE__*/ createWriteContract({
  abi: GOTIntentAbi,
  functionName: 'settle',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link GOTIntentAbi}__
 */
export const simulateGOTIntent = /*#__PURE__*/ createSimulateContract({
  abi: GOTIntentAbi,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"executeFor"`
 */
export const simulateGOTIntentExecuteFor = /*#__PURE__*/ createSimulateContract(
  { abi: GOTIntentAbi, functionName: 'executeFor' },
)

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"recoverERC20"`
 */
export const simulateGOTIntentRecoverErc20 =
  /*#__PURE__*/ createSimulateContract({
    abi: GOTIntentAbi,
    functionName: 'recoverERC20',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"recoverNative"`
 */
export const simulateGOTIntentRecoverNative =
  /*#__PURE__*/ createSimulateContract({
    abi: GOTIntentAbi,
    functionName: 'recoverNative',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"resolve"`
 */
export const simulateGOTIntentResolve = /*#__PURE__*/ createSimulateContract({
  abi: GOTIntentAbi,
  functionName: 'resolve',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link GOTIntentAbi}__ and `functionName` set to `"settle"`
 */
export const simulateGOTIntentSettle = /*#__PURE__*/ createSimulateContract({
  abi: GOTIntentAbi,
  functionName: 'settle',
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link GOTIntentAbi}__
 */
export const watchGOTIntentEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: GOTIntentAbi,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link GOTIntentAbi}__ and `eventName` set to `"ERC20Recovered"`
 */
export const watchGOTIntentErc20RecoveredEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: GOTIntentAbi,
    eventName: 'ERC20Recovered',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link GOTIntentAbi}__ and `eventName` set to `"NativeRecovered"`
 */
export const watchGOTIntentNativeRecoveredEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: GOTIntentAbi,
    eventName: 'NativeRecovered',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link GOTIntentAbi}__ and `eventName` set to `"TransferProcessed"`
 */
export const watchGOTIntentTransferProcessedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: GOTIntentAbi,
    eventName: 'TransferProcessed',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTLensAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x8226700c98f675a825cbfbabbc776171c474b113)
 */
export const readGOTLens = /*#__PURE__*/ createReadContract({
  abi: GOTLensAbi,
  address: GOTLensAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTLensAbi}__ and `functionName` set to `"ERC165_GAS_LIMIT"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x8226700c98f675a825cbfbabbc776171c474b113)
 */
export const readGOTLensErc165GasLimit = /*#__PURE__*/ createReadContract({
  abi: GOTLensAbi,
  address: GOTLensAddress,
  functionName: 'ERC165_GAS_LIMIT',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTLensAbi}__ and `functionName` set to `"ERC20_BALANCE_GAS_LIMIT"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x8226700c98f675a825cbfbabbc776171c474b113)
 */
export const readGOTLensErc20BalanceGasLimit = /*#__PURE__*/ createReadContract(
  {
    abi: GOTLensAbi,
    address: GOTLensAddress,
    functionName: 'ERC20_BALANCE_GAS_LIMIT',
  },
)

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTLensAbi}__ and `functionName` set to `"GOT_FACTORY"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x8226700c98f675a825cbfbabbc776171c474b113)
 */
export const readGOTLensGotFactory = /*#__PURE__*/ createReadContract({
  abi: GOTLensAbi,
  address: GOTLensAddress,
  functionName: 'GOT_FACTORY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTLensAbi}__ and `functionName` set to `"INTENT_READ_GAS_LIMIT"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x8226700c98f675a825cbfbabbc776171c474b113)
 */
export const readGOTLensIntentReadGasLimit = /*#__PURE__*/ createReadContract({
  abi: GOTLensAbi,
  address: GOTLensAddress,
  functionName: 'INTENT_READ_GAS_LIMIT',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTLensAbi}__ and `functionName` set to `"OWNER_RESOLVER_GAS_LIMIT"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x8226700c98f675a825cbfbabbc776171c474b113)
 */
export const readGOTLensOwnerResolverGasLimit =
  /*#__PURE__*/ createReadContract({
    abi: GOTLensAbi,
    address: GOTLensAddress,
    functionName: 'OWNER_RESOLVER_GAS_LIMIT',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTLensAbi}__ and `functionName` set to `"snapshot"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x8226700c98f675a825cbfbabbc776171c474b113)
 */
export const readGOTLensSnapshot = /*#__PURE__*/ createReadContract({
  abi: GOTLensAbi,
  address: GOTLensAddress,
  functionName: 'snapshot',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTLensAbi}__ and `functionName` set to `"snapshotMany"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x8226700c98f675a825cbfbabbc776171c474b113)
 */
export const readGOTLensSnapshotMany = /*#__PURE__*/ createReadContract({
  abi: GOTLensAbi,
  address: GOTLensAddress,
  functionName: 'snapshotMany',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTNameAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const readGOTName = /*#__PURE__*/ createReadContract({
  abi: GOTNameAbi,
  address: GOTNameAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTNameAbi}__ and `functionName` set to `"CLAIM_TYPEHASH"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const readGOTNameClaimTypehash = /*#__PURE__*/ createReadContract({
  abi: GOTNameAbi,
  address: GOTNameAddress,
  functionName: 'CLAIM_TYPEHASH',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTNameAbi}__ and `functionName` set to `"CLAIM_VERIFIER"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const readGOTNameClaimVerifier = /*#__PURE__*/ createReadContract({
  abi: GOTNameAbi,
  address: GOTNameAddress,
  functionName: 'CLAIM_VERIFIER',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTNameAbi}__ and `functionName` set to `"accountOf"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const readGOTNameAccountOf = /*#__PURE__*/ createReadContract({
  abi: GOTNameAbi,
  address: GOTNameAddress,
  functionName: 'accountOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTNameAbi}__ and `functionName` set to `"deriveNameKey"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const readGOTNameDeriveNameKey = /*#__PURE__*/ createReadContract({
  abi: GOTNameAbi,
  address: GOTNameAddress,
  functionName: 'deriveNameKey',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTNameAbi}__ and `functionName` set to `"eip712Domain"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const readGOTNameEip712Domain = /*#__PURE__*/ createReadContract({
  abi: GOTNameAbi,
  address: GOTNameAddress,
  functionName: 'eip712Domain',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTNameAbi}__ and `functionName` set to `"resolveOwner"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const readGOTNameResolveOwner = /*#__PURE__*/ createReadContract({
  abi: GOTNameAbi,
  address: GOTNameAddress,
  functionName: 'resolveOwner',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTNameAbi}__ and `functionName` set to `"supportsInterface"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const readGOTNameSupportsInterface = /*#__PURE__*/ createReadContract({
  abi: GOTNameAbi,
  address: GOTNameAddress,
  functionName: 'supportsInterface',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link GOTNameAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const writeGOTName = /*#__PURE__*/ createWriteContract({
  abi: GOTNameAbi,
  address: GOTNameAddress,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link GOTNameAbi}__ and `functionName` set to `"claim"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const writeGOTNameClaim = /*#__PURE__*/ createWriteContract({
  abi: GOTNameAbi,
  address: GOTNameAddress,
  functionName: 'claim',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link GOTNameAbi}__ and `functionName` set to `"transfer"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const writeGOTNameTransfer = /*#__PURE__*/ createWriteContract({
  abi: GOTNameAbi,
  address: GOTNameAddress,
  functionName: 'transfer',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link GOTNameAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const simulateGOTName = /*#__PURE__*/ createSimulateContract({
  abi: GOTNameAbi,
  address: GOTNameAddress,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link GOTNameAbi}__ and `functionName` set to `"claim"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const simulateGOTNameClaim = /*#__PURE__*/ createSimulateContract({
  abi: GOTNameAbi,
  address: GOTNameAddress,
  functionName: 'claim',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link GOTNameAbi}__ and `functionName` set to `"transfer"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const simulateGOTNameTransfer = /*#__PURE__*/ createSimulateContract({
  abi: GOTNameAbi,
  address: GOTNameAddress,
  functionName: 'transfer',
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link GOTNameAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const watchGOTNameEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: GOTNameAbi,
  address: GOTNameAddress,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link GOTNameAbi}__ and `eventName` set to `"EIP712DomainChanged"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const watchGOTNameEip712DomainChangedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: GOTNameAbi,
    address: GOTNameAddress,
    eventName: 'EIP712DomainChanged',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link GOTNameAbi}__ and `eventName` set to `"NameClaimed"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const watchGOTNameClaimedEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: GOTNameAbi,
  address: GOTNameAddress,
  eventName: 'NameClaimed',
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link GOTNameAbi}__ and `eventName` set to `"NameTransferred"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x68a0a95e22e289d4b852ed2ece6fb3a54ac936af)
 */
export const watchGOTNameTransferredEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: GOTNameAbi,
    address: GOTNameAddress,
    eventName: 'NameTransferred',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTSubscriptionAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1d7d3f702ccf67461b942c7a3f682cd9e7a28bb0)
 */
export const readGOTSubscription = /*#__PURE__*/ createReadContract({
  abi: GOTSubscriptionAbi,
  address: GOTSubscriptionAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTSubscriptionAbi}__ and `functionName` set to `"BINDING_VERSION"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1d7d3f702ccf67461b942c7a3f682cd9e7a28bb0)
 */
export const readGOTSubscriptionBindingVersion =
  /*#__PURE__*/ createReadContract({
    abi: GOTSubscriptionAbi,
    address: GOTSubscriptionAddress,
    functionName: 'BINDING_VERSION',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTSubscriptionAbi}__ and `functionName` set to `"GOT_FACTORY"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1d7d3f702ccf67461b942c7a3f682cd9e7a28bb0)
 */
export const readGOTSubscriptionGotFactory = /*#__PURE__*/ createReadContract({
  abi: GOTSubscriptionAbi,
  address: GOTSubscriptionAddress,
  functionName: 'GOT_FACTORY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link GOTSubscriptionAbi}__ and `functionName` set to `"SPEND_PERMISSION_MANAGER"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1d7d3f702ccf67461b942c7a3f682cd9e7a28bb0)
 */
export const readGOTSubscriptionSpendPermissionManager =
  /*#__PURE__*/ createReadContract({
    abi: GOTSubscriptionAbi,
    address: GOTSubscriptionAddress,
    functionName: 'SPEND_PERMISSION_MANAGER',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link GOTSubscriptionAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1d7d3f702ccf67461b942c7a3f682cd9e7a28bb0)
 */
export const writeGOTSubscription = /*#__PURE__*/ createWriteContract({
  abi: GOTSubscriptionAbi,
  address: GOTSubscriptionAddress,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link GOTSubscriptionAbi}__ and `functionName` set to `"execute"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1d7d3f702ccf67461b942c7a3f682cd9e7a28bb0)
 */
export const writeGOTSubscriptionExecute = /*#__PURE__*/ createWriteContract({
  abi: GOTSubscriptionAbi,
  address: GOTSubscriptionAddress,
  functionName: 'execute',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link GOTSubscriptionAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1d7d3f702ccf67461b942c7a3f682cd9e7a28bb0)
 */
export const simulateGOTSubscription = /*#__PURE__*/ createSimulateContract({
  abi: GOTSubscriptionAbi,
  address: GOTSubscriptionAddress,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link GOTSubscriptionAbi}__ and `functionName` set to `"execute"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1d7d3f702ccf67461b942c7a3f682cd9e7a28bb0)
 */
export const simulateGOTSubscriptionExecute =
  /*#__PURE__*/ createSimulateContract({
    abi: GOTSubscriptionAbi,
    address: GOTSubscriptionAddress,
    functionName: 'execute',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link GOTSubscriptionAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1d7d3f702ccf67461b942c7a3f682cd9e7a28bb0)
 */
export const watchGOTSubscriptionEvent = /*#__PURE__*/ createWatchContractEvent(
  { abi: GOTSubscriptionAbi, address: GOTSubscriptionAddress },
)

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link GOTSubscriptionAbi}__ and `eventName` set to `"SubscriptionTransferProcessed"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0x1d7d3f702ccf67461b942c7a3f682cd9e7a28bb0)
 */
export const watchGOTSubscriptionTransferProcessedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: GOTSubscriptionAbi,
    address: GOTSubscriptionAddress,
    eventName: 'SubscriptionTransferProcessed',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTFactoryAbi}__
 */
export const readIGOTFactory = /*#__PURE__*/ createReadContract({
  abi: IGOTFactoryAbi,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTFactoryAbi}__ and `functionName` set to `"configHash"`
 */
export const readIGOTFactoryConfigHash = /*#__PURE__*/ createReadContract({
  abi: IGOTFactoryAbi,
  functionName: 'configHash',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTFactoryAbi}__ and `functionName` set to `"previewAddress"`
 */
export const readIGOTFactoryPreviewAddress = /*#__PURE__*/ createReadContract({
  abi: IGOTFactoryAbi,
  functionName: 'previewAddress',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTFactoryAbi}__ and `functionName` set to `"quoteGrossAmount"`
 */
export const readIGOTFactoryQuoteGrossAmount = /*#__PURE__*/ createReadContract(
  { abi: IGOTFactoryAbi, functionName: 'quoteGrossAmount' },
)

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTFactoryAbi}__ and `functionName` set to `"quoteOwnerAmount"`
 */
export const readIGOTFactoryQuoteOwnerAmount = /*#__PURE__*/ createReadContract(
  { abi: IGOTFactoryAbi, functionName: 'quoteOwnerAmount' },
)

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link IGOTFactoryAbi}__
 */
export const writeIGOTFactory = /*#__PURE__*/ createWriteContract({
  abi: IGOTFactoryAbi,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link IGOTFactoryAbi}__ and `functionName` set to `"deployAndExecute"`
 */
export const writeIGOTFactoryDeployAndExecute =
  /*#__PURE__*/ createWriteContract({
    abi: IGOTFactoryAbi,
    functionName: 'deployAndExecute',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link IGOTFactoryAbi}__
 */
export const simulateIGOTFactory = /*#__PURE__*/ createSimulateContract({
  abi: IGOTFactoryAbi,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link IGOTFactoryAbi}__ and `functionName` set to `"deployAndExecute"`
 */
export const simulateIGOTFactoryDeployAndExecute =
  /*#__PURE__*/ createSimulateContract({
    abi: IGOTFactoryAbi,
    functionName: 'deployAndExecute',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__
 */
export const readIGOTIntent = /*#__PURE__*/ createReadContract({
  abi: IGOTIntentAbi,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"amount"`
 */
export const readIGOTIntentAmount = /*#__PURE__*/ createReadContract({
  abi: IGOTIntentAbi,
  functionName: 'amount',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"authorizedResolver"`
 */
export const readIGOTIntentAuthorizedResolver =
  /*#__PURE__*/ createReadContract({
    abi: IGOTIntentAbi,
    functionName: 'authorizedResolver',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"factory"`
 */
export const readIGOTIntentFactory = /*#__PURE__*/ createReadContract({
  abi: IGOTIntentAbi,
  functionName: 'factory',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"feeBps"`
 */
export const readIGOTIntentFeeBps = /*#__PURE__*/ createReadContract({
  abi: IGOTIntentAbi,
  functionName: 'feeBps',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"initialDeadline"`
 */
export const readIGOTIntentInitialDeadline = /*#__PURE__*/ createReadContract({
  abi: IGOTIntentAbi,
  functionName: 'initialDeadline',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"intentId"`
 */
export const readIGOTIntentId = /*#__PURE__*/ createReadContract({
  abi: IGOTIntentAbi,
  functionName: 'intentId',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"metadataHash"`
 */
export const readIGOTIntentMetadataHash = /*#__PURE__*/ createReadContract({
  abi: IGOTIntentAbi,
  functionName: 'metadataHash',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"owner"`
 */
export const readIGOTIntentOwner = /*#__PURE__*/ createReadContract({
  abi: IGOTIntentAbi,
  functionName: 'owner',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"ownerKey"`
 */
export const readIGOTIntentOwnerKey = /*#__PURE__*/ createReadContract({
  abi: IGOTIntentAbi,
  functionName: 'ownerKey',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"ownerSource"`
 */
export const readIGOTIntentOwnerSource = /*#__PURE__*/ createReadContract({
  abi: IGOTIntentAbi,
  functionName: 'ownerSource',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"partner"`
 */
export const readIGOTIntentPartner = /*#__PURE__*/ createReadContract({
  abi: IGOTIntentAbi,
  functionName: 'partner',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"period"`
 */
export const readIGOTIntentPeriod = /*#__PURE__*/ createReadContract({
  abi: IGOTIntentAbi,
  functionName: 'period',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"token"`
 */
export const readIGOTIntentToken = /*#__PURE__*/ createReadContract({
  abi: IGOTIntentAbi,
  functionName: 'token',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"totalProcessed"`
 */
export const readIGOTIntentTotalProcessed = /*#__PURE__*/ createReadContract({
  abi: IGOTIntentAbi,
  functionName: 'totalProcessed',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link IGOTIntentAbi}__
 */
export const writeIGOTIntent = /*#__PURE__*/ createWriteContract({
  abi: IGOTIntentAbi,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"executeFor"`
 */
export const writeIGOTIntentExecuteFor = /*#__PURE__*/ createWriteContract({
  abi: IGOTIntentAbi,
  functionName: 'executeFor',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"recoverERC20"`
 */
export const writeIGOTIntentRecoverErc20 = /*#__PURE__*/ createWriteContract({
  abi: IGOTIntentAbi,
  functionName: 'recoverERC20',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"recoverNative"`
 */
export const writeIGOTIntentRecoverNative = /*#__PURE__*/ createWriteContract({
  abi: IGOTIntentAbi,
  functionName: 'recoverNative',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"resolve"`
 */
export const writeIGOTIntentResolve = /*#__PURE__*/ createWriteContract({
  abi: IGOTIntentAbi,
  functionName: 'resolve',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"settle"`
 */
export const writeIGOTIntentSettle = /*#__PURE__*/ createWriteContract({
  abi: IGOTIntentAbi,
  functionName: 'settle',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link IGOTIntentAbi}__
 */
export const simulateIGOTIntent = /*#__PURE__*/ createSimulateContract({
  abi: IGOTIntentAbi,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"executeFor"`
 */
export const simulateIGOTIntentExecuteFor =
  /*#__PURE__*/ createSimulateContract({
    abi: IGOTIntentAbi,
    functionName: 'executeFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"recoverERC20"`
 */
export const simulateIGOTIntentRecoverErc20 =
  /*#__PURE__*/ createSimulateContract({
    abi: IGOTIntentAbi,
    functionName: 'recoverERC20',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"recoverNative"`
 */
export const simulateIGOTIntentRecoverNative =
  /*#__PURE__*/ createSimulateContract({
    abi: IGOTIntentAbi,
    functionName: 'recoverNative',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"resolve"`
 */
export const simulateIGOTIntentResolve = /*#__PURE__*/ createSimulateContract({
  abi: IGOTIntentAbi,
  functionName: 'resolve',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link IGOTIntentAbi}__ and `functionName` set to `"settle"`
 */
export const simulateIGOTIntentSettle = /*#__PURE__*/ createSimulateContract({
  abi: IGOTIntentAbi,
  functionName: 'settle',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTNameAbi}__
 */
export const readIGOTName = /*#__PURE__*/ createReadContract({
  abi: IGOTNameAbi,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTNameAbi}__ and `functionName` set to `"accountOf"`
 */
export const readIGOTNameAccountOf = /*#__PURE__*/ createReadContract({
  abi: IGOTNameAbi,
  functionName: 'accountOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTNameAbi}__ and `functionName` set to `"deriveNameKey"`
 */
export const readIGOTNameDeriveNameKey = /*#__PURE__*/ createReadContract({
  abi: IGOTNameAbi,
  functionName: 'deriveNameKey',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTNameAbi}__ and `functionName` set to `"resolveOwner"`
 */
export const readIGOTNameResolveOwner = /*#__PURE__*/ createReadContract({
  abi: IGOTNameAbi,
  functionName: 'resolveOwner',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTNameAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const readIGOTNameSupportsInterface = /*#__PURE__*/ createReadContract({
  abi: IGOTNameAbi,
  functionName: 'supportsInterface',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link IGOTNameAbi}__
 */
export const writeIGOTName = /*#__PURE__*/ createWriteContract({
  abi: IGOTNameAbi,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link IGOTNameAbi}__ and `functionName` set to `"claim"`
 */
export const writeIGOTNameClaim = /*#__PURE__*/ createWriteContract({
  abi: IGOTNameAbi,
  functionName: 'claim',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link IGOTNameAbi}__ and `functionName` set to `"transfer"`
 */
export const writeIGOTNameTransfer = /*#__PURE__*/ createWriteContract({
  abi: IGOTNameAbi,
  functionName: 'transfer',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link IGOTNameAbi}__
 */
export const simulateIGOTName = /*#__PURE__*/ createSimulateContract({
  abi: IGOTNameAbi,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link IGOTNameAbi}__ and `functionName` set to `"claim"`
 */
export const simulateIGOTNameClaim = /*#__PURE__*/ createSimulateContract({
  abi: IGOTNameAbi,
  functionName: 'claim',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link IGOTNameAbi}__ and `functionName` set to `"transfer"`
 */
export const simulateIGOTNameTransfer = /*#__PURE__*/ createSimulateContract({
  abi: IGOTNameAbi,
  functionName: 'transfer',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTOwnerResolverAbi}__
 */
export const readIGOTOwnerResolver = /*#__PURE__*/ createReadContract({
  abi: IGOTOwnerResolverAbi,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTOwnerResolverAbi}__ and `functionName` set to `"resolveOwner"`
 */
export const readIGOTOwnerResolverResolveOwner =
  /*#__PURE__*/ createReadContract({
    abi: IGOTOwnerResolverAbi,
    functionName: 'resolveOwner',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link IGOTOwnerResolverAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const readIGOTOwnerResolverSupportsInterface =
  /*#__PURE__*/ createReadContract({
    abi: IGOTOwnerResolverAbi,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link ISpendPermissionManagerAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xf85210B21cC50302F477BA56686d2019dC9b67Ad)
 */
export const readISpendPermissionManager = /*#__PURE__*/ createReadContract({
  abi: ISpendPermissionManagerAbi,
  address: ISpendPermissionManagerAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link ISpendPermissionManagerAbi}__ and `functionName` set to `"isApproved"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xf85210B21cC50302F477BA56686d2019dC9b67Ad)
 */
export const readISpendPermissionManagerIsApproved =
  /*#__PURE__*/ createReadContract({
    abi: ISpendPermissionManagerAbi,
    address: ISpendPermissionManagerAddress,
    functionName: 'isApproved',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link ISpendPermissionManagerAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xf85210B21cC50302F477BA56686d2019dC9b67Ad)
 */
export const writeISpendPermissionManager = /*#__PURE__*/ createWriteContract({
  abi: ISpendPermissionManagerAbi,
  address: ISpendPermissionManagerAddress,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link ISpendPermissionManagerAbi}__ and `functionName` set to `"approveWithSignature"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xf85210B21cC50302F477BA56686d2019dC9b67Ad)
 */
export const writeISpendPermissionManagerApproveWithSignature =
  /*#__PURE__*/ createWriteContract({
    abi: ISpendPermissionManagerAbi,
    address: ISpendPermissionManagerAddress,
    functionName: 'approveWithSignature',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link ISpendPermissionManagerAbi}__ and `functionName` set to `"spend"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xf85210B21cC50302F477BA56686d2019dC9b67Ad)
 */
export const writeISpendPermissionManagerSpend =
  /*#__PURE__*/ createWriteContract({
    abi: ISpendPermissionManagerAbi,
    address: ISpendPermissionManagerAddress,
    functionName: 'spend',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link ISpendPermissionManagerAbi}__
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xf85210B21cC50302F477BA56686d2019dC9b67Ad)
 */
export const simulateISpendPermissionManager =
  /*#__PURE__*/ createSimulateContract({
    abi: ISpendPermissionManagerAbi,
    address: ISpendPermissionManagerAddress,
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link ISpendPermissionManagerAbi}__ and `functionName` set to `"approveWithSignature"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xf85210B21cC50302F477BA56686d2019dC9b67Ad)
 */
export const simulateISpendPermissionManagerApproveWithSignature =
  /*#__PURE__*/ createSimulateContract({
    abi: ISpendPermissionManagerAbi,
    address: ISpendPermissionManagerAddress,
    functionName: 'approveWithSignature',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link ISpendPermissionManagerAbi}__ and `functionName` set to `"spend"`
 *
 * [__View Contract on Base Basescan__](https://basescan.org/address/0xf85210B21cC50302F477BA56686d2019dC9b67Ad)
 */
export const simulateISpendPermissionManagerSpend =
  /*#__PURE__*/ createSimulateContract({
    abi: ISpendPermissionManagerAbi,
    address: ISpendPermissionManagerAddress,
    functionName: 'spend',
  })
