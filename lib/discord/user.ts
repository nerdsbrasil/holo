/** PROTOTYPE — fetch Discord user by id (nome/foto). Server-only. */

export type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  banner: string | null;
  accent_color: number | null;
};

function defaultAvatarUrl(id: string) {
  try {
    const index = Number(BigInt(id) / BigInt(2 ** 22) % BigInt(6));
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  } catch {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}

export function discordAvatarUrl(id: string, avatar: string | null, size = 512) {
  if (!avatar) return defaultAvatarUrl(id);
  const ext = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}?size=${size}`;
}

export async function fetchDiscordUser(id: string): Promise<DiscordUser | null> {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) return null;

  const res = await fetch(`https://discord.com/api/v10/users/${id}`, {
    headers: {
      Authorization: `Bot ${token}`,
      "User-Agent": "DiscordBot (https://nerdsbrasil.com, 0.1.0)",
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    console.error("[discord] fetch user failed", res.status, await res.text());
    return null;
  }

  return (await res.json()) as DiscordUser;
}
