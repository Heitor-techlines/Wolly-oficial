import React, { useState } from "react";

interface UserAvatarProps {
  avatar?: string | null;
  name?: string | null;
  className?: string; // e.g. "w-9 h-9" or "w-9.5 h-9.5"
  bgClassName?: string; // e.g. "bg-indigo-600"
  fallbackChar?: string;
  alt?: string;
  textClassName?: string;
}

export function isImageUrl(str?: string | null): boolean {
  if (!str) return false;
  const s = str.trim().toLowerCase();
  return (
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("data:") ||
    s.startsWith("blob:") ||
    s.endsWith(".png") ||
    s.endsWith(".jpg") ||
    s.endsWith(".jpeg") ||
    s.endsWith(".webp") ||
    s.endsWith(".gif") ||
    s.endsWith(".svg")
  );
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  name,
  className = "w-9 h-9",
  bgClassName = "bg-indigo-600",
  fallbackChar,
  alt = "Avatar",
  textClassName = "text-xs font-extrabold text-white",
}) => {
  const [imgError, setImgError] = useState(false);
  const displayChar = fallbackChar || (name && name.trim() ? name.trim()[0].toUpperCase() : "W");

  if (avatar && isImageUrl(avatar) && !imgError) {
    return (
      <div className={`${className} rounded-full overflow-hidden shrink-0 shadow-3xs flex items-center justify-center ${bgClassName} relative`}>
        <img
          src={avatar}
          alt={alt}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-full"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${className} rounded-full shrink-0 flex items-center justify-center ${textClassName} shadow-3xs overflow-hidden ${bgClassName}`}
    >
      {avatar && !isImageUrl(avatar) ? avatar : displayChar}
    </div>
  );
};

export default UserAvatar;
