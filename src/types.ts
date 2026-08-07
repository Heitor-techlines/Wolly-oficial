/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Profile {
  id: string;
  name: string;
  nickname: string;
  avatar: string; // Letter, or URL, or gradient
  avatarBg: string; // Tailwind color class or hex gradient
  banner: string; // Banner gradient CSS or image URL
  bio: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  followingIds: string[]; // List of profile IDs that this profile is following
  favoriteProfileIds?: string[]; // List of profile IDs marked as favorites
  crowns?: number; // Wolly Crowns balance
  isPrivate?: boolean; // Choose if profile is open or closed
  isVerified?: boolean; // Official verified status badge
  boosterFollowers?: number;
  feedPreferences?: FeedPreferences;
}

export interface FeedPreferences {
  order: "cronologico" | "inteligente";
  filterSource: "todos" | "seguindo" | "verificados";
  types: {
    gramps: boolean;
    clips: boolean;
    pulses: boolean;
    inks: boolean;
    postIts: boolean;
    challenges: boolean;
    searches: boolean;
  };
  favoritesFirst: boolean;
}

export interface CrownTransaction {
  id: string;
  profileId: string;
  amount: number;
  description: string;
  type: "earn" | "spend";
  createdAt: string;
}

export interface Comment {
  id: string;
  profileId: string;
  authorName: string;
  authorNickname: string;
  authorAvatar: string;
  authorAvatarBg: string;
  text: string;
  createdAt: string;
}

export interface Post {
  id: string;
  profileId: string;
  authorName: string;
  authorNickname: string;
  authorAvatar: string;
  authorAvatarBg: string;
  content: string;
  image?: string;
  theme?: string;
  hashtags: string[];
  createdAt: string; // ISO 8601 string
  likes: number;
  likedBy: string[]; // user profile IDs who liked
  disclosedWhyVisible: string; // Transparency: Why is this on your feed? (e.g. "Você segue este perfil")
  comments?: Comment[];
  sharesCount?: number;
  seriesId?: string;
  seriesChapter?: number;
  isPulse?: boolean;
  category?: string;
  newsTopic?: string;
}

export interface Clip {
  id: string;
  profileId: string;
  authorName: string;
  authorNickname?: string;
  authorAvatar: string;
  authorAvatarBg: string;
  videoPlaceholder: string; // Beautiful gradients representing video cover
  description: string;
  location: string;
  likes: number;
  likedBy: string[]; // profiles who liked
  theme?: string;
  hashtags?: string[];
  createdAt?: string;
  comments?: Comment[];
  sharesCount?: number;
  videoUrl?: string; // Data URL for true recorded/uploaded video
  videoFilter?: string; // CSS visual filter value
  videoTrimStart?: number; // cut start timestamp (seconds)
  videoTrimEnd?: number; // cut end timestamp (seconds)
  videoSpeed?: number; // playback speed modifier (e.g. 0.5, 1, 1.5, 2)
  seriesId?: string;
  seriesChapter?: number;
}

export interface Account {
  id: string;
  email: string;
  profileIds: string[];
}

export interface PostIt {
  id: string;
  profileId: string;
  authorName: string;
  authorNickname: string;
  authorAvatar: string;
  authorAvatarBg: string;
  content: string;
  bgColor: string; // Pastel tailwind colors: e.g. 'bg-yellow-101 border-yellow-210 text-yellow-900', etc.
  createdAt: string; // ISO 8601 string
  image?: string;
  music?: string; // Selected ambient song ID/title
  audioUrl?: string; // Uploaded custom audio Data URL or audio source URL
}

export const POSTIT_MUSIC_LIST = [
  { id: "garota_lofi", name: "Garota de Ipanema 🌴 (Lofi Beats)", icon: "🌴" },
  { id: "mas_que_nada", name: "Mas, Que Nada 🔥 (Bossa Synth)", icon: "🔥" },
  { id: "chorando_se_foi", name: "Chorando Se Foi 💃 (Lambada Neon)", icon: "💃" },
  { id: "construcao", name: "Construção ☕ (8-bit Indie)", icon: "☕" },
  { id: "aquarela", name: "Aquarela do Brasil 🎨 (Dream Wave)", icon: "🎨" }
];

export interface Ink {
  id: string;
  profileId: string;
  authorName: string;
  authorNickname: string;
  authorAvatar: string;
  authorAvatarBg: string;
  title: string;
  spectatorsCount: number;
  createdAt: string;
  seriesId?: string;
  seriesChapter?: number;
  liveFrame?: string;
}

export interface InkMessage {
  id: string;
  profileId: string;
  authorName: string;
  authorNickname: string;
  authorAvatar: string;
  authorAvatarBg: string;
  text: string;
  createdAt: string;
}

export interface Challenge {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorNickname: string;
  title: string;
  description: string;
  reward: number; // Crowns to earn
  expiresIn: string; // e.g. "5 dias"
  createdAt: string;
  expiresAt?: string; // Calculated ISO timestamp for exact expiration
}

export interface Series {
  id: string;
  title: string;
  description: string;
  cover?: string;
  profileId: string;
  authorName: string;
  authorNickname: string;
  createdAt: string;
  chaptersCount: number;
  followerIds: string[]; // List of profile IDs that follow this series
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  senderNickname: string;
  senderAvatar: string;
  senderAvatarBg: string;
  text: string;
  createdAt: string;
  sharedPostData?: {
    id: string;
    authorName: string;
    authorNickname: string;
    content: string;
    image?: string;
    isPulse?: boolean;
  };
  sharedClipData?: {
    id: string;
    authorName: string;
    description: string;
    videoUrl?: string;
  };
}

export interface Group {
  id: string;
  name: string;
  description: string;
  code: string; // 6-digit access code (e.g., "123456")
  creatorId: string;
  creatorName: string;
  createdAt: string;
  memberIds: string[]; // List of profile IDs that are members
  codeSnippet?: string; // Collaborative programming code
  codeLanguage?: string; // e.g., 'javascript', 'html', 'python', 'plaintext'
  lastSnippetUpdatedBy?: string; // Name of the user who last edited the code
}

export interface GroupMessage {
  id: string;
  groupId: string;
  profileId: string;
  authorName: string;
  authorNickname: string;
  authorAvatar: string;
  authorAvatarBg: string;
  text: string;
  createdAt: string;
}

export type SearchType = "single" | "multiple" | "scale" | "ranking";

export interface WollySearch {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorNickname: string;
  creatorAvatar: string;
  creatorAvatarBg?: string;
  title: string;
  description?: string;
  type: SearchType;
  options?: string[]; // for single, multiple, or ranking (max 5)
  maxScale?: number; // up to 10 for scale
  scaleMinLabel?: string; // e.g. "Discordo totalmente"
  scaleMaxLabel?: string; // e.g. "Concordo totalmente"
  createdAt: string;
  votesCount?: number;
}

export interface SearchVote {
  id: string;
  searchId: string;
  profileId: string;
  authorName: string;
  authorNickname: string;
  authorAvatar: string;
  authorAvatarBg?: string;
  votedAt: string;
  selectedOptions?: string[]; // for single or multiple
  scaleValue?: number; // for scale (1 to 10)
  rankingItems?: string[]; // for ranking (ordered list of items)
}







