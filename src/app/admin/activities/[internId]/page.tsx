import InternTimelineView from '@/components/shared/InternTimelineView';

export default function AdminInternTimelinePage({ params }: { params: { internId: string } }) {
  return <InternTimelineView internId={params.internId} backHref="/admin/activities" />;
}
