import InternTimelineView from '@/components/shared/InternTimelineView';

export default function BKKInternTimelinePage({ params }: { params: { id: string } }) {
  return <InternTimelineView internId={params.id} backHref="/bkk/interns" />;
}
