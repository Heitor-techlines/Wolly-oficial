/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export let onFirestoreError: ((error: string, op: OperationType, path: string | null) => void) | null = null;

export function registerFirestoreErrorHandler(handler: (error: string, op: OperationType, path: string | null) => void) {
  onFirestoreError = handler;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errStr = error instanceof Error ? error.message : String(error);
  const isQuotaOrOffline = errStr.includes("Quota limit exceeded") || 
                           errStr.includes("quota") || 
                           errStr.includes("resource-exhausted") || 
                           errStr.includes("unavailable") || 
                           errStr.includes("Could not reach Cloud Firestore backend");

  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isQuotaOrOffline) {
    console.warn("Firestore Quota/Offline notice:", errStr, `[${operationType}:${path}]`);
  } else {
    console.error("Firestore Error Detailed Wrap: ", JSON.stringify(errInfo));
  }

  if (onFirestoreError) {
    try {
      onFirestoreError(errStr, operationType, path);
    } catch (e) {
      console.error("Failed to invoke registered firestore error handler:", e);
    }
  }
}

export function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .map((item) => cleanUndefined(item))
      .filter((item) => item !== undefined) as unknown as T;
  }
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === "object") {
        result[key] = cleanUndefined(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as T;
}
