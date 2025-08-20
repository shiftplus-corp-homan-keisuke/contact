/**
 * 分析機能の型定義
 */

export interface InquiryStatistics {
    totalInquiries: number;
    newInquiries: number;
    inProgressInquiries: number;
    resolvedInquiries: number;
    closedInquiries: number;
    averageResponseTime: number; // 時間単位
    averageResolutionTime: number; // 時間単位
    satisfactionScore?: number;
    categoryBreakdown: CategoryStats[];
    appBreakdown: AppStats[];
    statusBreakdown: StatusStats[];
    priorityBreakdown: PriorityStats[];
}

export interface CategoryStats {
    category: string;
    count: number;
    percentage: number;
    averageResponseTime: number;
}

export interface AppStats {
    appId: string;
    appName: string;
    count: number;
    percentage: number;
    averageResponseTime: number;
    averageResolutionTime: number;
}

export interface StatusStats {
    status: string;
    count: number;
    percentage: number;
}

export interface PriorityStats {
    priority: string;
    count: number;
    percentage: number;
    averageResponseTime: number;
}

export interface ResponseTimeAnalytics {
    averageFirstResponse: number;
    averageResolution: number;
    medianFirstResponse: number;
    medianResolution: number;
    responseTimeByHour: HourlyStats[];
    responseTimeByDay: DailyStats[];
    responseTimeByCategory: CategoryResponseTime[];
}

export interface HourlyStats {
    hour: number;
    averageResponseTime: number;
    inquiryCount: number;
}

export interface DailyStats {
    date: string;
    averageResponseTime: number;
    inquiryCount: number;
    resolvedCount: number;
}

export interface CategoryResponseTime {
    category: string;
    averageResponseTime: number;
    averageResolutionTime: number;
}

export interface AnalyticsFilters {
    startDate?: Date;
    endDate?: Date;
    appIds?: string[];
    categories?: string[];
    statuses?: string[];
    priorities?: string[];
    assignedTo?: string[];
}

export interface DashboardData {
    statistics: InquiryStatistics;
    responseTimeAnalytics: ResponseTimeAnalytics;
    recentTrends: TrendData[];
    topCategories: CategoryStats[];
    topApps: AppStats[];
}

export interface TrendData {
    date: string;
    value: number;
    metric: string;
}

export interface RealTimeUpdate {
    type: 'inquiry_created' | 'inquiry_updated' | 'inquiry_resolved';
    data: any;
    timestamp: Date;
}
// パフォーマンス分析関連の型定義
export interface UserPerformance {
    userId: string;
    userName: string;
    totalInquiries: number;
    resolvedInquiries: number;
    averageResponseTime: number;
    averageResolutionTime: number;
    resolutionRate: number;
    satisfactionScore?: number;
    workload: 'low' | 'medium' | 'high';
    efficiency: number; // 0-100のスコア
}

export interface TeamPerformance {
    teamId: string;
    teamName: string;
    members: UserPerformance[];
    totalInquiries: number;
    resolvedInquiries: number;
    averageResponseTime: number;
    averageResolutionTime: number;
    resolutionRate: number;
    teamEfficiency: number;
    workloadDistribution: WorkloadDistribution;
}

export interface WorkloadDistribution {
    low: number;
    medium: number;
    high: number;
}

export interface SLACompliance {
    totalInquiries: number;
    slaCompliantInquiries: number;
    complianceRate: number;
    averageResponseTime: number;
    slaTarget: number;
    violations: SLAViolation[];
    complianceByCategory: CategorySLACompliance[];
    complianceByPriority: PrioritySLACompliance[];
}

export interface SLAViolation {
    inquiryId: string;
    title: string;
    priority: string;
    category: string;
    responseTime: number;
    slaTarget: number;
    violationTime: number;
    assignedTo?: string;
}

export interface CategorySLACompliance {
    category: string;
    totalInquiries: number;
    compliantInquiries: number;
    complianceRate: number;
    averageResponseTime: number;
    slaTarget: number;
}

export interface PrioritySLACompliance {
    priority: string;
    totalInquiries: number;
    compliantInquiries: number;
    complianceRate: number;
    averageResponseTime: number;
    slaTarget: number;
}

export interface TrendAnalysis {
    metric: string;
    period: 'daily' | 'weekly' | 'monthly';
    data: TrendDataPoint[];
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercentage: number;
}

export interface TrendDataPoint {
    date: string;
    value: number;
    label?: string;
}

export interface ReportConfig {
    name: string;
    type: 'performance' | 'sla' | 'trend' | 'custom';
    filters: AnalyticsFilters;
    metrics: string[];
    format: 'json' | 'csv' | 'pdf';
    schedule?: ReportSchedule;
}

export interface ReportSchedule {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:mm format
    recipients: string[];
    enabled: boolean;
}

// 予測分析関連の型定義
export interface PredictionData {
    metric: string;
    period: 'daily' | 'weekly' | 'monthly';
    predictions: PredictionPoint[];
    confidence: number; // 0-100の信頼度
    model: string;
    accuracy: number; // 過去の予測精度
    lastUpdated: Date;
}

export interface PredictionPoint {
    date: string;
    predictedValue: number;
    confidenceInterval: {
        lower: number;
        upper: number;
    };
    factors?: PredictionFactor[];
}

export interface PredictionFactor {
    name: string;
    impact: number; // -100 to 100
    description: string;
}

export interface ResourceDemandPrediction {
    period: string;
    predictedInquiries: number;
    recommendedStaffing: StaffingRecommendation;
    workloadDistribution: PredictedWorkloadDistribution;
    peakHours: number[];
    seasonalFactors: SeasonalFactor[];
}

export interface StaffingRecommendation {
    totalStaff: number;
    skillDistribution: SkillDistribution[];
    shiftRecommendations: ShiftRecommendation[];
}

export interface SkillDistribution {
    skill: string;
    requiredCount: number;
    currentCount: number;
    gap: number;
}

export interface ShiftRecommendation {
    timeSlot: string;
    recommendedStaff: number;
    priority: 'high' | 'medium' | 'low';
    reason: string;
}

export interface PredictedWorkloadDistribution {
    byCategory: CategoryWorkload[];
    byPriority: PriorityWorkload[];
    byApp: AppWorkload[];
}

export interface CategoryWorkload {
    category: string;
    predictedVolume: number;
    averageComplexity: number;
    estimatedHours: number;
}

export interface PriorityWorkload {
    priority: string;
    predictedVolume: number;
    slaRequirement: number;
    estimatedHours: number;
}

export interface AppWorkload {
    appId: string;
    appName: string;
    predictedVolume: number;
    averageResolutionTime: number;
    estimatedHours: number;
}

export interface SeasonalFactor {
    name: string;
    impact: number;
    period: string;
    description: string;
}

export interface PredictionModel {
    name: string;
    type: 'linear_regression' | 'time_series' | 'machine_learning';
    accuracy: number;
    lastTrained: Date;
    features: string[];
    parameters: Record<string, any>;
}

export interface ModelTrainingData {
    features: number[][];
    targets: number[];
    dates: string[];
    metadata: Record<string, any>;
}

export interface PredictionVisualization {
    chartType: 'line' | 'bar' | 'area';
    data: VisualizationDataPoint[];
    annotations: ChartAnnotation[];
    config: ChartConfig;
}

export interface VisualizationDataPoint {
    x: string | number;
    y: number;
    type: 'actual' | 'predicted' | 'confidence_upper' | 'confidence_lower';
    label?: string;
}

export interface ChartAnnotation {
    type: 'line' | 'area' | 'point';
    position: { x: string | number; y?: number };
    text: string;
    color?: string;
}

export interface ChartConfig {
    title: string;
    xAxisLabel: string;
    yAxisLabel: string;
    showLegend: boolean;
    showGrid: boolean;
    colors: string[];
}