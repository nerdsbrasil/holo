/** PROTOTYPE — dados fake pra testar /c/[id]. Não é produção. */

import {
  discordAvatarUrl,
  type DiscordUser,
} from "@/lib/discord/user";

export type MemberLicenseMock = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  memberNumber: string;
  /** Endereço fictício estilo DL */
  street: string;
  cityLine: string;
  nationality: string;
  sex: string;
  height: string;
  eyes: string;
  /** DOB fictício (editável) */
  birthLabel: string;
  joinedAt: string;
  joinedLabel: string;
  issueLabel: string;
  expLabel: string;
  tenure: string;
  nerdClass: string;
  roles: { name: string; color: string }[];
  xp: number;
  level: number;
  rank: number;
  source: "discord" | "mock";
};

/** Flavor editável pelo usuário no card (localStorage no spike). */
export type CardFlavorEdits = {
  nationality: string;
  birthLabel: string;
  sex: string;
  height: string;
  eyes: string;
  street: string;
  cityLine: string;
};

export type OvdShape = "circle" | "square" | "triangle";

function shortNumber(id: string) {
  const tail = id.slice(-6).padStart(6, "0");
  return `NB-${tail.slice(0, 2)}-${tail.slice(2)}`;
}

/** Hash simples só pra variar mock por id (não é crypto). */
function seedFromId(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function formatBr(d: Date) {
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Emissão = join; validade = join + 10–11 anos (~2035/36 no mock). */
function deriveDates(seed: number) {
  const year = 2024 + (seed % 2);
  const month = 1 + (seed % 12);
  const day = 1 + (seed % 27);
  const joined = new Date(Date.UTC(year, month - 1, day));
  const years = 10 + (seed % 2);
  const exp = new Date(Date.UTC(year + years, month - 1, day));
  const birth = new Date(
    Date.UTC(1990 + (seed % 15), (seed * 3) % 12, 1 + (seed % 27)),
  );

  const tenureYears = Math.max(0, new Date().getUTCFullYear() - year);
  const tenureMonths = (seed % 11) + 1;

  return {
    joinedAt: joined.toISOString().slice(0, 10),
    joinedLabel: formatBr(joined),
    issueLabel: formatBr(joined),
    expLabel: formatBr(exp),
    birthLabel: formatBr(birth),
    tenure: `${tenureYears}a ${tenureMonths}m`,
  };
}

function mockStats(id: string) {
  const seed = seedFromId(id);
  const classes = ["Iniciante", "Nerd", "Hacker", "Lenda"] as const;
  const nerdClass = classes[seed % classes.length]!;
  const level = 3 + (seed % 40);
  const xp = level * 1000 + (seed % 800);
  const sexes = ["M", "F", "X"] as const;
  const dates = deriveDates(seed);

  return {
    nerdClass,
    xp,
    level,
    rank: 12 + (seed % 90),
    roles: [
      { name: "membro", color: "#5ec8ff" },
      { name: "geral", color: "#a78bfa" },
      ...(seed % 2 === 0
        ? [{ name: "eventos", color: "#34d399" }]
        : [{ name: "dev", color: "#f472b6" }]),
    ] as { name: string; color: string }[],
    street: "Rua Belterra, 291",
    cityLine: "Santo Amaro, SP",
    nationality: "NB",
    sex: sexes[seed % sexes.length]!,
    height: `${5 + (seed % 2)}-${(8 + (seed % 4)).toString().padStart(2, "0")}`,
    eyes: seed % 2 === 0 ? "BRO" : "HZL",
    ...dates,
  };
}

export function flavorDefaults(member: MemberLicenseMock): CardFlavorEdits {
  return {
    nationality: member.nationality,
    birthLabel: member.birthLabel,
    sex: member.sex,
    height: member.height,
    eyes: member.eyes,
    street: member.street,
    cityLine: member.cityLine,
  };
}

export function buildMockMember(id: string): MemberLicenseMock {
  const stats = mockStats(id);
  const isDemo = id === "demo" || id === "0";
  return {
    id,
    displayName: isDemo ? "Nerd Demo" : "Membro",
    username: isDemo ? "nerddemo" : `user_${id.slice(-4) || "0000"}`,
    avatarUrl: discordAvatarUrl(id, null),
    memberNumber: shortNumber(id),
    source: "mock",
    ...stats,
  };
}

/** Nome/foto reais do Discord + resto ainda mock (join/cargos/xp). */
export function buildMemberFromDiscord(user: DiscordUser): MemberLicenseMock {
  const stats = mockStats(user.id);
  return {
    id: user.id,
    displayName: user.global_name || user.username,
    username: user.username,
    avatarUrl: discordAvatarUrl(user.id, user.avatar),
    memberNumber: shortNumber(user.id),
    source: "discord",
    ...stats,
  };
}
