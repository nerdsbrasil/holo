import { MemberCardShowcase } from "@/components/prototype/member-card-showcase";
import { fetchDiscordUser } from "@/lib/discord/user";
import {
  buildMemberFromDiscord,
  buildMockMember,
} from "@/lib/prototype/mock-member";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberCardSpikePage({ params }: PageProps) {
  const { id } = await params;
  const discordUser = await fetchDiscordUser(id);
  const member = discordUser
    ? buildMemberFromDiscord(discordUser)
    : buildMockMember(id);

  return <MemberCardShowcase member={member} />;
}
