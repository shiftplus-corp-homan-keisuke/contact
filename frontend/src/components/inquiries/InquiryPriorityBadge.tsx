import React from 'react';
import Badge from '@/components/ui/Badge';
import { InquiryPriority } from '@/types/inquiry';

interface InquiryPriorityBadgeProps {
    priority: InquiryPriority;
}

const priorityConfig = {
    low: { label: '低', variant: 'default' as const },
    medium: { label: '中', variant: 'info' as const },
    high: { label: '高', variant: 'warning' as const },
    urgent: { label: '緊急', variant: 'error' as const },
};

export default function InquiryPriorityBadge({ priority }: InquiryPriorityBadgeProps) {
    const config = priorityConfig[priority];

    return (
        <Badge variant={config.variant}>
            {config.label}
        </Badge>
    );
}