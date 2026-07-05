import InternTimelineView from '@/components/shared/InternTimelineView';

export default function PembinaInternTimelinePage({ params }: { params: { id: string } }) {
  return <InternTimelineView internId={params.id} backHref="/pembina/home" />;
}
