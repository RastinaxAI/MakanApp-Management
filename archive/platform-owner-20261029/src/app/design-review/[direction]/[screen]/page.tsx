import { notFound } from 'next/navigation';
import { isDirection, isScreen, isReviewEnabled } from '@/features/design-review/model';
import { Review } from '@/features/design-review/review';
export const dynamic = 'force-dynamic';
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ direction: string; screen: string }>;
}) {
  if (!isReviewEnabled(process.env.MAKAN_DESIGN_REVIEW)) notFound();
  const { direction, screen } = await params;
  if (!isDirection(direction) || !isScreen(screen)) notFound();
  return <Review key={`${direction}/${screen}`} direction={direction} screen={screen} />;
}
