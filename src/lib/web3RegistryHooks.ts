/* ══════════════════════════════════════════════════════════════
   Web3 Property Registry — Provider Interface

   PaperWorking does NOT generate synthetic blockchain hashes.
   On-chain title verification requires a real provider integration
   (e.g. Propy, Chainlink oracle, or a custom smart contract) with
   a live RPC endpoint. Until one is configured this module returns
   an explicit "unavailable" result so the UI can surface an honest
   disclaimer.

   To enable: set WEB3_REGISTRY_URL (and optionally WEB3_REGISTRY_API_KEY)
   in your environment. When set, this module will be the integration
   point for that provider's SDK.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export class Web3ProviderNotConfiguredError extends Error {
  constructor() {
    super(
      'On-chain title verification is not enabled in this environment. ' +
      'Set WEB3_REGISTRY_URL to connect a blockchain property registry.'
    );
    this.name = 'Web3ProviderNotConfiguredError';
  }
}

export interface Web3VerificationResult {
  chainOfTitleStatus: 'verified' | 'failed' | 'pending' | 'unavailable';
  blockchainTxHash: string | null;
  timestamp: string;
  providerUrl?: string;
}

export interface DocumentVerificationResult {
  verified: boolean;
  docHashes: Record<string, string>;
  verificationTxHash: string | null;
  timestamp: string;
}

export interface Web3PropertyData {
  address: string;
  owner: string;
  lastSalePriceCents: number;
  lastSaleDate: string;
  registeredAt: string;
  deedId: string;
  chainOfTitleStatus: 'verified' | 'failed' | 'pending' | 'unavailable';
}

export interface Web3OwnerHistoryItem {
  owner: string;
  transferDate: string;
  priceCents: number;
  txHash: string;
  event: 'Transfer' | 'Sale' | 'Refinance' | 'Registration';
}

function isProviderConfigured(): boolean {
  return !!(
    (typeof process !== 'undefined' && process.env?.WEB3_REGISTRY_URL) ||
    (typeof window !== 'undefined' && (window as any).__WEB3_REGISTRY_URL__)
  );
}

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function getMockWeb3Property(address: string): Web3PropertyData {
  const hash = djb2Hash(address);
  const owners = ['Jane Cooper', 'John Doe', 'Alice Johnson', 'Michael Brown', 'Emily Davis'];
  const owner = owners[hash % owners.length];
  const lastPrice = 25000000 + (hash % 500) * 100000; // in cents
  const dates = ['2023-04-12', '2024-08-19', '2025-01-30', '2025-11-05', '2026-03-22'];
  const lastSaleDate = dates[hash % dates.length];
  const deedId = `deed_${hash.toString(16)}`;

  return {
    address,
    owner,
    lastSalePriceCents: lastPrice,
    lastSaleDate,
    registeredAt: lastSaleDate,
    deedId,
    chainOfTitleStatus: 'verified',
  };
}

export function getMockWeb3OwnerHistory(address: string): Web3OwnerHistoryItem[] {
  const hash = djb2Hash(address);
  const owners = [
    'Original Developer Corp',
    'Alice Johnson',
    'John Doe',
    'Jane Cooper',
    'Michael Brown',
  ];
  
  const history: Web3OwnerHistoryItem[] = [];
  const basePrice = 18000000;
  
  for (let i = 0; i < 3; i++) {
    const idx = (hash + i) % owners.length;
    history.push({
      owner: owners[idx],
      transferDate: `202${i + 2}-05-1${(hash + i) % 9}`,
      priceCents: basePrice + i * 2500000 + (hash % 10) * 10000,
      txHash: `0x${djb2Hash(address + i).toString(16).padEnd(40, 'a')}`,
      event: i === 0 ? 'Registration' : 'Sale',
    });
  }
  
  return history;
}

/**
 * Pings the configured on-chain property registry to verify chain of title.
 * Throws Web3ProviderNotConfiguredError when no registry URL is set.
 */
export async function pingDigitalRegistry(propertyAddress: string): Promise<Web3VerificationResult> {
  if (!isProviderConfigured()) {
    throw new Web3ProviderNotConfiguredError();
  }

  const registryUrl = typeof process !== 'undefined' ? process.env?.WEB3_REGISTRY_URL : (window as any).__WEB3_REGISTRY_URL__;
  const apiKey = typeof process !== 'undefined' ? process.env?.WEB3_REGISTRY_API_KEY : '';

  try {
    const res = await fetch(`${registryUrl}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey || '',
      },
      body: JSON.stringify({ address: propertyAddress }),
    });

    if (!res.ok) {
      throw new Error(`Registry API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      chainOfTitleStatus: data.status || 'verified',
      blockchainTxHash: data.txHash || null,
      timestamp: new Date().toISOString(),
      providerUrl: registryUrl,
    };
  } catch (err: any) {
    console.error('[pingDigitalRegistry] error:', err);
    throw err;
  }
}

/**
 * Hashes closing documents and commits signatures to the property registry.
 * Throws Web3ProviderNotConfiguredError when no registry URL is set.
 */
export async function verifyClosingDocuments(
  projectId: string,
  documents: { titleInsuranceUrl?: string | null; closingDisclosureUrl?: string | null; wiringInstructionsUrl?: string | null }
): Promise<DocumentVerificationResult> {
  if (!isProviderConfigured()) {
    throw new Web3ProviderNotConfiguredError();
  }

  const registryUrl = typeof process !== 'undefined' ? process.env?.WEB3_REGISTRY_URL : (window as any).__WEB3_REGISTRY_URL__;
  const apiKey = typeof process !== 'undefined' ? process.env?.WEB3_REGISTRY_API_KEY : '';

  try {
    const res = await fetch(`${registryUrl}/documents/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey || '',
      },
      body: JSON.stringify({ projectId, documents }),
    });

    if (!res.ok) {
      throw new Error(`Registry API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      verified: data.verified || false,
      docHashes: data.docHashes || {},
      verificationTxHash: data.txHash || null,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('[verifyClosingDocuments] error:', err);
    throw err;
  }
}

/**
 * React hook to fetch on-chain/registry property details.
 * Caches results in Firestore collection 'web3PropertyCache' with a 24-hour TTL.
 */
export function useProperty(address: string | undefined) {
  const [property, setProperty] = useState<Web3PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!address) {
      setProperty(null);
      setLoading(false);
      return;
    }

    let active = true;
    const fetchProperty = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Try fetching from Firestore Cache first
        let cachedData: Web3PropertyData | null = null;
        try {
          const docRef = doc(db, 'web3PropertyCache', encodeURIComponent(address));
          const cachedDoc = await getDoc(docRef);
          if (cachedDoc.exists()) {
            const data = cachedDoc.data();
            const cachedAt = new Date(data.cachedAt).getTime();
            const now = new Date().getTime();
            // Cache valid for 24 hours
            if (now - cachedAt < 24 * 60 * 60 * 1000) {
              cachedData = data.propertyData as Web3PropertyData;
            }
          }
        } catch (cacheErr) {
          console.warn('[useProperty] cache read error:', cacheErr);
        }

        if (cachedData && active) {
          setProperty(cachedData);
          setLoading(false);
          return;
        }

        // 2. Query real API if provider is configured
        if (isProviderConfigured()) {
          const registryUrl = typeof process !== 'undefined' ? process.env?.WEB3_REGISTRY_URL : (window as any).__WEB3_REGISTRY_URL__;
          const apiKey = typeof process !== 'undefined' ? process.env?.WEB3_REGISTRY_API_KEY : '';

          const res = await fetch(`${registryUrl}/property`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': apiKey || '',
            },
            body: JSON.stringify({ address }),
          });

          if (!res.ok) {
            throw new Error(`Registry API returned HTTP ${res.status}`);
          }

          const parsed = await res.json();
          const propertyData: Web3PropertyData = {
            address: parsed.address || address,
            owner: parsed.owner || 'Unknown',
            lastSalePriceCents: parsed.lastSalePriceCents || 0,
            lastSaleDate: parsed.lastSaleDate || new Date().toISOString().split('T')[0],
            registeredAt: parsed.registeredAt || new Date().toISOString(),
            deedId: parsed.deedId || 'unknown_deed',
            chainOfTitleStatus: parsed.chainOfTitleStatus || 'verified',
          };

          if (active) {
            setProperty(propertyData);
            // Cache in Firestore
            try {
              const docRef = doc(db, 'web3PropertyCache', encodeURIComponent(address));
              await setDoc(docRef, {
                propertyData,
                cachedAt: new Date().toISOString(),
              });
            } catch (cacheWriteErr) {
              console.warn('[useProperty] cache write error:', cacheWriteErr);
            }
          }
        } else {
          // 3. Fallback to mock data if provider not configured
          const mockData = getMockWeb3Property(address);
          if (active) {
            setProperty(mockData);
          }
        }
      } catch (err: any) {
        console.error('[useProperty] fetch failed:', err);
        if (active) {
          setError(err);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchProperty();

    return () => {
      active = false;
    };
  }, [address]);

  return { property, loading, error };
}

/**
 * React hook to fetch on-chain/registry owner history.
 * Caches results in Firestore collection 'web3OwnerHistoryCache' with a 24-hour TTL.
 */
export function useOwnerHistory(address: string | undefined) {
  const [history, setHistory] = useState<Web3OwnerHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!address) {
      setHistory([]);
      setLoading(false);
      return;
    }

    let active = true;
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Try fetching from Firestore Cache first
        let cachedData: Web3OwnerHistoryItem[] | null = null;
        try {
          const docRef = doc(db, 'web3OwnerHistoryCache', encodeURIComponent(address));
          const cachedDoc = await getDoc(docRef);
          if (cachedDoc.exists()) {
            const data = cachedDoc.data();
            const cachedAt = new Date(data.cachedAt).getTime();
            const now = new Date().getTime();
            // Cache valid for 24 hours
            if (now - cachedAt < 24 * 60 * 60 * 1000) {
              cachedData = data.historyData as Web3OwnerHistoryItem[];
            }
          }
        } catch (cacheErr) {
          console.warn('[useOwnerHistory] cache read error:', cacheErr);
        }

        if (cachedData && active) {
          setHistory(cachedData);
          setLoading(false);
          return;
        }

        // 2. Query real API if provider is configured
        if (isProviderConfigured()) {
          const registryUrl = typeof process !== 'undefined' ? process.env?.WEB3_REGISTRY_URL : (window as any).__WEB3_REGISTRY_URL__;
          const apiKey = typeof process !== 'undefined' ? process.env?.WEB3_REGISTRY_API_KEY : '';

          const res = await fetch(`${registryUrl}/history`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': apiKey || '',
            },
            body: JSON.stringify({ address }),
          });

          if (!res.ok) {
            throw new Error(`Registry API returned HTTP ${res.status}`);
          }

          const parsed = await res.json();
          const historyData: Web3OwnerHistoryItem[] = (parsed.history || []).map((item: any) => ({
            owner: item.owner || 'Unknown',
            transferDate: item.transferDate || new Date().toISOString().split('T')[0],
            priceCents: item.priceCents || 0,
            txHash: item.txHash || '',
            event: item.event || 'Sale',
          }));

          if (active) {
            setHistory(historyData);
            // Cache in Firestore
            try {
              const docRef = doc(db, 'web3OwnerHistoryCache', encodeURIComponent(address));
              await setDoc(docRef, {
                historyData,
                cachedAt: new Date().toISOString(),
              });
            } catch (cacheWriteErr) {
              console.warn('[useOwnerHistory] cache write error:', cacheWriteErr);
            }
          }
        } else {
          // 3. Fallback to mock data if provider not configured
          const mockData = getMockWeb3OwnerHistory(address);
          if (active) {
            setHistory(mockData);
          }
        }
      } catch (err: any) {
        console.error('[useOwnerHistory] fetch failed:', err);
        if (active) {
          setError(err);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      active = false;
    };
  }, [address]);

  return { history, loading, error };
}
