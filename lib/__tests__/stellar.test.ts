import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrKey } from '@stellar/stellar-sdk';

// We import the module under test dynamically inside tests where env matters,
// because the module reads process.env at import time for URL resolution.
// For pure functions like isValidContractId we can import statically.

describe('isValidContractId', () => {
  // A real, checksum-valid contract ID (USDC SAC on mainnet-style StrKey).
  // Generated via StrKey.encodeContract over a 32-byte payload.
  const VALID_CONTRACT_ID = StrKey.encodeContract(
    Buffer.from(
      'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      'hex'
    )
  );

  // A valid G-address (account) — correct StrKey but wrong type for a contract.
  const VALID_G_ADDRESS = StrKey.encodeEd25519PublicKey(
    Buffer.from(
      '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
      'hex'
    )
  );

  it('accepts a valid contract ID', async () => {
    const { isValidContractId } = await import('../stellar');
    expect(isValidContractId(VALID_CONTRACT_ID)).toBe(true);
  });

  it('rejects a one-character typo (valid format, bad checksum)', async () => {
    const { isValidContractId } = await import('../stellar');
    // Flip the last character to another valid base32 char. Format still
    // matches /^C[A-Z2-7]{55}$/ but the CRC16 checksum no longer matches.
    const lastChar = VALID_CONTRACT_ID.slice(-1);
    const replacement = lastChar === 'A' ? 'B' : 'A';
    const typo = VALID_CONTRACT_ID.slice(0, -1) + replacement;

    // Sanity: the typo still passes the naive regex used previously.
    expect(/^C[A-Z2-7]{55}$/.test(typo)).toBe(true);
    // But StrKey rejects it.
    expect(StrKey.isValidContract(typo)).toBe(false);

    expect(isValidContractId(typo)).toBe(false);
  });

  it('rejects a G-address (wrong type)', async () => {
    const { isValidContractId } = await import('../stellar');
    expect(VALID_G_ADDRESS.startsWith('G')).toBe(true);
    expect(isValidContractId(VALID_G_ADDRESS)).toBe(false);
  });

  it('rejects garbage input', async () => {
    const { isValidContractId } = await import('../stellar');
    expect(isValidContractId('')).toBe(false);
    expect(isValidContractId('not-a-contract')).toBe(false);
    expect(isValidContractId('C' + 'A'.repeat(55))).toBe(false);
  });

  it('distinguishes bad checksum from bad format in error messages', async () => {
    const { validateContractId } = await import('../stellar');

    // Bad format: does not match the C... shape at all.
    const badFormat = validateContractId('not-a-contract');
    expect(badFormat.valid).toBe(false);
    if (!badFormat.valid) {
      expect(badFormat.reason).toBe('format');
      expect(badFormat.message.toLowerCase()).toContain('format');
    }

    // Bad checksum: correct shape, wrong checksum.
    const lastChar = VALID_CONTRACT_ID.slice(-1);
    const replacement = lastChar === 'A' ? 'B' : 'A';
    const typo = VALID_CONTRACT_ID.slice(0, -1) + replacement;
    const badChecksum = validateContractId(typo);
    expect(badChecksum.valid).toBe(false);
    if (!badChecksum.valid) {
      expect(badChecksum.reason).toBe('checksum');
      expect(badChecksum.message.toLowerCase()).toContain('checksum');
    }

    // Valid case.
    const ok = validateContractId(VALID_CONTRACT_ID);
    expect(ok.valid).toBe(true);
  });
});

describe('URL override resolution', () => {
  const ENV_KEYS = [
    'NEXT_PUBLIC_HORIZON_URL',
    'NEXT_PUBLIC_SOROBAN_RPC_URL',
    'NEXT_PUBLIC_HORIZON_URL_MAINNET',
    'NEXT_PUBLIC_HORIZON_URL_TESTNET',
    'NEXT_PUBLIC_HORIZON_URL_FUTURENET',
    'NEXT_PUBLIC_SOROBAN_RPC_URL_MAINNET',
    'NEXT_PUBLIC_SOROBAN_RPC_URL_TESTNET',
    'NEXT_PUBLIC_SOROBAN_RPC_URL_FUTURENET',
  ];

  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
    vi.resetModules();
  });

  it('uses defaults when nothing is set', async () => {
    const mod = await import('../stellar');
    expect(mod.getHorizonUrl('mainnet')).toBe(mod.HORIZON_URLS.mainnet);
    expect(mod.getHorizonUrl('testnet')).toBe(mod.HORIZON_URLS.testnet);
    expect(mod.getHorizonUrl('futurenet')).toBe(mod.HORIZON_URLS.futurenet);
    expect(mod.getSorobanRpcUrl('mainnet')).toBe(
      mod.SOROBAN_RPC_URLS.mainnet
    );
    expect(mod.getSorobanRpcUrl('testnet')).toBe(
      mod.SOROBAN_RPC_URLS.testnet
    );
    expect(mod.getSorobanRpcUrl('futurenet')).toBe(
      mod.SOROBAN_RPC_URLS.futurenet
    );
  });

  it('per-network override wins over default', async () => {
    process.env.NEXT_PUBLIC_HORIZON_URL_MAINNET = 'https://horizon.example.com';
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL_MAINNET =
      'https://rpc.example.com';

    const mod = await import('../stellar');
    expect(mod.getHorizonUrl('mainnet')).toBe('https://horizon.example.com');
    expect(mod.getSorobanRpcUrl('mainnet')).toBe('https://rpc.example.com');
    // Other networks unaffected.
    expect(mod.getHorizonUrl('testnet')).toBe(mod.HORIZON_URLS.testnet);
    expect(mod.getSorobanRpcUrl('testnet')).toBe(
      mod.SOROBAN_RPC_URLS.testnet
    );
  });

  it('per-network override wins over legacy single-variable form', async () => {
    process.env.NEXT_PUBLIC_HORIZON_URL = 'https://legacy.example.com';
    process.env.NEXT_PUBLIC_HORIZON_URL_TESTNET = 'https://testnet.example.com';

    const mod = await import('../stellar');
    expect(mod.getHorizonUrl('testnet')).toBe('https://testnet.example.com');
  });

  it('legacy single-variable form applies to testnet only', async () => {
    process.env.NEXT_PUBLIC_HORIZON_URL = 'https://legacy-horizon.example.com';
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL = 'https://legacy-rpc.example.com';

    const mod = await import('../stellar');
    expect(mod.getHorizonUrl('testnet')).toBe(
      'https://legacy-horizon.example.com'
    );
    expect(mod.getSorobanRpcUrl('testnet')).toBe(
      'https://legacy-rpc.example.com'
    );
    // Mainnet and futurenet keep defaults.
    expect(mod.getHorizonUrl('mainnet')).toBe(mod.HORIZON_URLS.mainnet);
    expect(mod.getHorizonUrl('futurenet')).toBe(mod.HORIZON_URLS.futurenet);
    expect(mod.getSorobanRpcUrl('mainnet')).toBe(
      mod.SOROBAN_RPC_URLS.mainnet
    );
    expect(mod.getSorobanRpcUrl('futurenet')).toBe(
      mod.SOROBAN_RPC_URLS.futurenet
    );
  });

  it('invalid override falls back to default', async () => {
    process.env.NEXT_PUBLIC_HORIZON_URL_MAINNET = 'not-a-url';
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL_MAINNET = 'also-not-a-url';

    const mod = await import('../stellar');
    expect(mod.getHorizonUrl('mainnet')).toBe(mod.HORIZON_URLS.mainnet);
    expect(mod.getSorobanRpcUrl('mainnet')).toBe(
      mod.SOROBAN_RPC_URLS.mainnet
    );
  });

  it('invalid legacy override falls back to default for testnet', async () => {
    process.env.NEXT_PUBLIC_HORIZON_URL = 'nope';
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL = 'nope';

    const mod = await import('../stellar');
    expect(mod.getHorizonUrl('testnet')).toBe(mod.HORIZON_URLS.testnet);
    expect(mod.getSorobanRpcUrl('testnet')).toBe(
      mod.SOROBAN_RPC_URLS.testnet
    );
  });
});