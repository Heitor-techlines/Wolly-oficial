import { db , } from './firebase'
import { collection, addDoc } from "firebase/firestore";
import { Profile, DirectMessage } from "../types";
import React from "react";

/**
 * Scans content for `@` mentions matching any profile's nickname or name.
 * For each mentioned profile, creates a direct message in Firestore `direct_messages`:
 * "Te marquei, @(perfil marcado)"
 */
export async function processMentionsInContent(
  content: string,
  contentType: "gramp" | "pulse" | "postit",
  authorProfile: Profile,
  allProfiles: Profile[],
  addNotification?: (msg: string, type: "chat" | "publish" | "crowns") => void
) {
  if (!content || !content.includes("@")) return;

  const textLower = content.toLowerCase();
  const mentionedProfiles: Profile[] = [];

  for (const p of allProfiles) {
    if (!p || p.id === authorProfile.id) continue;

    const nick = (p.nickname || "").replace(/^@/, "").trim().toLowerCase();
    const name = (p.name || "").trim().toLowerCase();

    let matched = false;

    if (nick && textLower.includes(`@${nick}`)) {
      matched = true;
    } else if (name && textLower.includes(`@${name}`)) {
      matched = true;
    }

    if (matched && !mentionedProfiles.some((mp) => mp.id === p.id)) {
      mentionedProfiles.push(p);
    }
  }

  for (const target of mentionedProfiles) {
    const handle = `@${(target.nickname || target.name).replace(/^@/, "")}`;
    const directMsg: Omit<DirectMessage, "id"> = {
      senderId: authorProfile.id,
      receiverId: target.id,
      senderName: authorProfile.name,
      senderNickname: authorProfile.nickname,
      senderAvatar: authorProfile.avatar,
      senderAvatarBg: authorProfile.avatarBg,
      text: `Te marquei, ${handle}`,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "direct_messages"), cleanUndefined(directMsg));
      if (addNotification) {
        addNotification(`Você marcou ${target.name} (${handle}) no seu ${contentType === "postit" ? "Post It 📌" : contentType === "pulse" ? "Pulse ⚡" : "Gramp 📸"}! ✉️`, "chat");
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem de menção:", err);
    }
  }
}

/**
 * Helper to render text with highlighted `@mention` tags
 */
export function renderTextWithMentions(text: string): React.ReactNode {
  if (!text) return null;

  // Regex matches @mention tokens (e.g. @nickname or @Name)
  const parts = text.split(/(@[a-zA-Z0-9_\-\u00C0-\u00FF]+(?:\s[a-zA-Z0-9_\-\u00C0-\u00FF]+)?)/g);

  return parts.map((part, i) => {
    if (part && part.startsWith("@")) {
      return (
        <span
          key={i}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 rounded-md text-[0.95em] shadow-2xs"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

