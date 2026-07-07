import InternTimelineView from '@/components/shared/InternTimelineView';
import SecurityWrapper from '@/components/shared/SecurityWrapper';

export default function BKKInternTimelinePage({ params }: { params: { id: string } }) {
  return (
    <SecurityWrapper>
      <InternTimelineView internId={params.id} backHref="/bkk/interns" viewerRole="bkk" />
    </SecurityWrapper>
  );
}
