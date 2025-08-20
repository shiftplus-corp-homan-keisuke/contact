import React from 'react';
import Badge from '@/components/ui/Badge';
import { InquiryStatus } from '@/types/inquiry';

interface InquiryStatusBadgeProps {
    status: InquiryStatus;
}

const statusConfig = {
    new: { label: '新規', variant: 'info' as const },
    in_progress: { label: '対応中', variant: 'warning' as const },
    pending: { label: '保留', variant: 'default' as const },
    resolved: { label: '解決済み', variant: 'success' as const },
    closed: { label: 'クローズ', variant: 'default' as const },
};

export default function InquiryStatusBadge({ status }: InquiryStatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <Badge variant={config.variant}>
            {config.label}
        </Badge>
    );
}