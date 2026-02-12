import GamePage from "../page";

export default async function GameByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GamePage initialGameId={id} />;
}
