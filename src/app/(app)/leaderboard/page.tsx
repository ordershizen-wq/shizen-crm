import { redirect } from 'next/navigation';

type SearchParams = Promise<{ month?: string }>;

export default async function LeaderboardRedirect({ searchParams }: { searchParams: SearchParams }) {
  const { month } = await searchParams;
  const qs = month ? `&month=${encodeURIComponent(month)}` : '';
  redirect(`/insights?tab=leaderboard${qs}`);
}
