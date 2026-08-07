/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Challenge } from "../types";

/**
 * Converts a text duration string (e.g. "24 horas", "3 dias", "5 dias", "1 hora")
 * into milliseconds.
 */
export function parseExpirationMs(expiresIn: string): number {
  if (!expiresIn) return 5 * 24 * 60 * 60 * 1000; // default 5 days
  const text = expiresIn.toLowerCase().trim();
  const numMatch = text.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1], 10) : 5;

  if (text.includes("hora")) {
    return num * 60 * 60 * 1000;
  }
  if (text.includes("dia")) {
    return num * 24 * 60 * 60 * 1000;
  }
  if (text.includes("minuto")) {
    return num * 60 * 1000;
  }
  return num * 24 * 60 * 60 * 1000; // default to days
}

/**
 * Calculates the exact expiration timestamp (in milliseconds since epoch) for a challenge.
 */
export function getChallengeExpirationTimestamp(challenge: Challenge): number {
  if (challenge.expiresAt) {
    const t = new Date(challenge.expiresAt).getTime();
    if (!isNaN(t)) return t;
  }
  const createdTime = challenge.createdAt ? new Date(challenge.createdAt).getTime() : Date.now();
  const durationMs = parseExpirationMs(challenge.expiresIn || "5 dias");
  return createdTime + durationMs;
}

/**
 * Checks whether a challenge has expired.
 */
export function isChallengeExpired(challenge: Challenge): boolean {
  const expireTimestamp = getChallengeExpirationTimestamp(challenge);
  return Date.now() >= expireTimestamp;
}

/**
 * Returns detailed formatted time remaining info for a challenge.
 */
export function getChallengeRemainingTime(challenge: Challenge): { 
  text: string; 
  isExpired: boolean; 
  percentRemaining: number;
  diffMs: number;
} {
  const expireTimestamp = getChallengeExpirationTimestamp(challenge);
  const createdTimestamp = challenge.createdAt ? new Date(challenge.createdAt).getTime() : expireTimestamp - parseExpirationMs(challenge.expiresIn || "5 dias");
  const totalDuration = Math.max(1, expireTimestamp - createdTimestamp);
  const diffMs = expireTimestamp - Date.now();

  if (diffMs <= 0) {
    return { text: "Expirado", isExpired: true, percentRemaining: 0, diffMs: 0 };
  }

  const percentRemaining = Math.min(100, Math.max(0, (diffMs / totalDuration) * 100));

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  let text = "";
  if (diffDays > 0) {
    const remHours = diffHours % 24;
    text = remHours > 0 ? `${diffDays}d ${remHours}h restantes` : `${diffDays} dia${diffDays > 1 ? 's' : ''} restantes`;
  } else if (diffHours > 0) {
    const remMin = diffMin % 60;
    text = `${diffHours}h ${remMin}m restantes`;
  } else if (diffMin > 0) {
    const remSec = diffSec % 60;
    text = `${diffMin}m ${remSec}s restantes`;
  } else {
    text = `${diffSec}s restantes`;
  }

  return { text, isExpired: false, percentRemaining, diffMs };
}
