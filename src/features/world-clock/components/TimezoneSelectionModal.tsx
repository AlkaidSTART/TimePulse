import { useCallback } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { TimezoneDialogShell } from './TimezoneDialogShell';
import { TimezonePicker } from './TimezonePicker';
import type { TimezoneOption } from './timezone-data';

type TimezoneSelectionModalProps = {
  onClose: () => void;
  onSelectTimezone: (timezone: string, city: string, country: string) => void;
  title?: string;
};

export default function TimezoneSelectionModal({
  onClose,
  onSelectTimezone,
  title,
}: TimezoneSelectionModalProps) {
  const { t } = useTranslation();
  const modalTitle = title ?? t('modal.timezone.title', '选择时区');

  const handleSelectTimezone = useCallback((timezone: TimezoneOption) => {
    onSelectTimezone(timezone.timezone, timezone.city, timezone.country);
  }, [onSelectTimezone]);

  return (
    <TimezoneDialogShell title={modalTitle} onClose={onClose}>
      <TimezonePicker onSelectTimezone={handleSelectTimezone} />
    </TimezoneDialogShell>
  );
}

