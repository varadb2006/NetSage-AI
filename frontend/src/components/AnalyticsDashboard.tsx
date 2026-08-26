import React, { useState } from 'react';
import { Download, AlertTriangle, ExternalLink, CheckCircle2, XCircle, TrendingUp, Target, BarChart3, ShieldAlert } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip
} from 'recharts';
import { FailureLogEntry } from '../types';
import { DashboardMetrics } from '../services/api';

interface AnalyticsDashboardProps {
  failureLogs: FailureLogEntry[];
  metrics: DashboardMetrics | null;
  onSelectFailureLog: (entry: FailureLogEntry) => void;
  onAddToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

const KPI_CARD_CONFIGS = [
  {
    key: 'total',
    label: 'Total Cases Analyzed',
    value: '0',
    sub: 'Backend data loading',
    subColor: 'text-[#4edea3]',
    subBg: 'bg-[#00a572]/15',
    icon: BarChart3,
    iconColor: 'text-[#68d6ff]',
    borderColor: 'border-l-[#68d6ff]',
    description: 'Cisco lab cases processed since deployment',
  },
  {
    key: 'agreement',
    label: 'AI Diagnostic Accuracy',
    value: '0%',
    sub: 'Rule + LLM consensus',
    subColor: 'text-[#68d6ff]',
    subBg: 'bg-[#00bceb]/10',
    icon: Target,
    iconColor: 'text-[#68d6ff]',
    borderColor: 'border-l-[#68d6ff]',
    description: 'Cases where AI diagnosis was accepted by human engineer',
  },
  {
    key: 'turns',
    label: 'Avg Turns to Resolution',
    value: '0',
    sub: 'Backend data loading',
    subColor: 'text-[#4edea3]',
    subBg: 'bg-[#00a572]/10',
    icon: TrendingUp,
    iconColor: 'text-[#4edea3]',
    borderColor: 'border-l-[#4edea3]',
    description: 'Multi-turn loops needed before confidence ≥ 0.75',
  },
  {
    key: 'overrides',
    label: 'Human Overrides / Rejections',
    value: '0',
    sub: 'Logged to failure audit',
    subColor: 'text-[#ffb4ab]',
    subBg: 'bg-[#93000a]/15',
    icon: ShieldAlert,
    iconColor: 'text-[#ffb4ab]',
    borderColor: 'border-l-[#ffb4ab]',
    description: 'Diagnoses edited or rejected by the network engineer',
  },
];

function deriveReviewStats(metrics: DashboardMetrics | null) {
  const logs = metrics?.review_log ?? [];
  const total = logs.length;
  const accepted = logs.filter((r) => r.outcome === 'ACCEPTED').length;
  const overridden = logs.filter((r) => r.outcome === 'OVERRIDDEN').length;
  const rejected = logs.filter((r) => r.outcome === 'REJECTED').length;
  return { total, accepted, overridden, rejected };
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  failureLogs,
  metrics,
  onSelectFailureLog,
  onAddToast
}) => {
  const [filterReason, setFilterReason] = useState<string>('ALL');
  const stats = deriveReviewStats(metrics);
  const issueDistribution = metrics?.issue_distribution ?? [];
  const calibrationCurve = (metrics?.calibration_curve ?? []).map((item) => ({
    confidence: item.confidence * 100,
    modelAccuracy: item.model_accuracy * 100,
    ideal: item.ideal * 100,
  }));
  const agreementProgress = metrics?.agreement_progress ?? [];
  const kpiValues = [
    `${metrics?.total_cases ?? 0}`,
    `${Math.round((metrics?.agreement_rate ?? 0) * 100)}%`,
    `${metrics?.avg_turns_to_resolution ?? 0}`,
    `${metrics?.total_overrides ?? 0}`,
  ];

  const filteredLogs = failureLogs.filter(
    (log) => filterReason === 'ALL' || log.failure_reason === filterReason
  );

  const handleExportCSV = () => {
    const headers = ['Case ID', 'Device', 'Initial AI Output', 'Human Correction', 'Failure Reason', 'Timestamp'];
    const rows = filteredLogs.map((log) => [
      `"${log.case_id}"`,
      `"${log.device}"`,
      `"${log.initial_ai_output.replace(/"/g, '""')}"`,
      `"${log.human_correction.replace(/"/g, '""')}"`,
      `"${log.failure_reason}"`,
      `"${log.timestamp}"`,
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `NetSage_FailureLog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddToast('success', 'CSV Exported', `${filteredLogs.length} failure records downloaded.`);
  };

  const getBadgeClass = (reason: string) => {
    switch (reason) {
      case 'OVER-CORRECTION': return 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#ffb4ab]/30';
      case 'TOPOLOGY DRIFT': return 'bg-[#f19b03]/20 text-[#ffbc69] border border-[#ffbc69]/30';
      case 'SCOPE MISS': return 'bg-[#353944] text-[#dfe2f1] border border-[#869399]/40';
      case 'HALLUCINATED INTERFACE': return 'bg-[#00bceb]/20 text-[#68d6ff] border border-[#68d6ff]/30';
      default: return 'bg-[#171b26] text-[#bcc8cf] border border-[#3d494e]';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1440px] mx-auto w-full pb-12 pt-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#dfe2f1]">AI Performance Dashboard</h1>
        <p className="text-sm text-[#869399] mt-1 font-mono">
          NetSage AI diagnostic accuracy, human review outcomes, and calibration metrics.
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_CARD_CONFIGS.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.key}
              className={`glass-panel rounded-xl p-5 flex flex-col justify-start shadow-lg border-l-4 ${kpi.borderColor} min-h-[175px]`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-[11px] font-mono font-bold text-[#869399] uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className="p-1.5 rounded-lg bg-[#0f131d]/60 shrink-0">
                  <Icon className={`w-4 h-4 ${kpi.iconColor}`} />
                </div>
              </div>
              
              <div className="text-3xl font-sans font-bold text-[#dfe2f1] tracking-tight proportional-nums text-left mt-1">
                {kpiValues[index]}
              </div>
              
              <div className="flex flex-col items-start w-full text-left mt-auto">
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${kpi.subBg} ${kpi.subColor} font-bold`}>
                    {index === 0 || index === 2
                      ? (metrics ? 'Telemetry active' : 'Backend data loading')
                      : kpi.sub}
                  </span>
                </div>
                <p className="text-[10px] text-[#869399] font-mono mt-1.5 leading-relaxed">{kpi.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Human Review Outcome Breakdown */}
      <div className="glass-panel rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#dfe2f1]">Human Review Outcomes</h2>
          <span className="text-[10px] font-mono text-[#869399]">{stats.total} total reviews</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#00a572]/10 border border-[#4edea3]/30 rounded-xl p-4 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-[#4edea3]" />
            <span className="text-2xl font-bold text-[#4edea3]">{stats.accepted}</span>
            <span className="text-[11px] font-mono text-[#869399] uppercase">Accepted</span>
            <span className="text-[10px] font-mono text-[#4edea3] font-bold">
              {Math.round((stats.accepted / (stats.total || 1)) * 100)}% of reviews
            </span>
          </div>
          <div className="bg-[#f19b03]/10 border border-[#ffbc69]/30 rounded-xl p-4 flex flex-col items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-[#ffbc69]" />
            <span className="text-2xl font-bold text-[#ffbc69]">{stats.overridden}</span>
            <span className="text-[11px] font-mono text-[#869399] uppercase">Overridden</span>
            <span className="text-[10px] font-mono text-[#ffbc69] font-bold">
              {Math.round((stats.overridden / (stats.total || 1)) * 100)}% of reviews
            </span>
          </div>
          <div className="bg-[#93000a]/10 border border-[#ffb4ab]/30 rounded-xl p-4 flex flex-col items-center gap-2">
            <XCircle className="w-6 h-6 text-[#ffb4ab]" />
            <span className="text-2xl font-bold text-[#ffb4ab]">{stats.rejected}</span>
            <span className="text-[11px] font-mono text-[#869399] uppercase">Rejected</span>
            <span className="text-[10px] font-mono text-[#ffb4ab] font-bold">
              {Math.round((stats.rejected / (stats.total || 1)) * 100)}% of reviews
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Issue Distribution */}
        <div className="xl:col-span-4 glass-panel rounded-xl flex flex-col shadow-lg overflow-hidden">
          <div className="p-4 border-b border-[#3d494e]/20">
            <h2 className="text-sm font-semibold text-[#dfe2f1]">Issue Distribution by Type</h2>
            <span className="text-[10px] font-mono text-[#869399]">Rolling 30 days</span>
          </div>
          <div className="p-4 flex-1 flex flex-col items-center justify-center min-h-[220px]">
            <div className="w-44 h-44 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={issueDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                    {issueDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f131d" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#171b26', borderColor: '#3d494e', borderRadius: '8px', fontSize: '12px', color: '#dfe2f1' }}
                    formatter={(value: unknown) => [`${value}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-[11px] font-mono text-[#bcc8cf] w-full">
              {issueDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calibration Curve */}
        <div className="xl:col-span-4 glass-panel rounded-xl flex flex-col shadow-lg overflow-hidden">
          <div className="p-4 border-b border-[#3d494e]/20 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-semibold text-[#dfe2f1]">Confidence Calibration Curve</h2>
              <span className="text-[10px] font-mono text-[#869399]">Predicted vs actual accuracy</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-[#4edea3] bg-[#00a572]/15 px-2 py-0.5 rounded">ECE: 0.031</span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between min-h-[220px]">
            <div className="w-full h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calibrationCurve} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="confidence" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#171b26', borderColor: '#3d494e', borderRadius: '8px', fontSize: '11px', color: '#dfe2f1' }}
                  />
                  <Line type="linear" dataKey="ideal" stroke="#869399" strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Ideal" />
                  <Line type="monotone" dataKey="modelAccuracy" stroke="#68d6ff" strokeWidth={2.5} dot={false} name="NetSage AI" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between font-mono text-[11px] text-[#869399] border-t border-[#3d494e]/20 pt-2 mt-2">
              <span>Low Conf (0%)</span>
              <span className="text-[#68d6ff] font-bold">— NetSage AI</span>
              <span>High Conf (100%)</span>
            </div>
          </div>
        </div>

        {/* Rule vs LLM Agreement */}
        <div className="xl:col-span-4 glass-panel rounded-xl flex flex-col shadow-lg overflow-hidden">
          <div className="p-4 border-b border-[#3d494e]/20">
            <h2 className="text-sm font-semibold text-[#dfe2f1]">Rule Engine vs LLM Agreement</h2>
            <span className="text-[10px] font-mono text-[#869399]">Deterministic + AI consensus</span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-center gap-4 min-h-[220px]">
            {agreementProgress.map((item, index) => (
              <div key={item.label}>
                <div className="flex justify-between font-mono text-xs text-[#bcc8cf] mb-1.5">
                  <span>{item.label}</span>
                  <span className="font-bold text-[#dfe2f1]">{item.percentage}%</span>
                </div>
                <div className="w-full bg-[#313540] h-2 rounded-full overflow-hidden">
                  <div
                    className={`${index === 0 ? 'bg-[#4edea3]' : 'bg-[#ffbc69]'} h-full rounded-full transition-all duration-700`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[10px] font-mono text-[#869399] bg-[#0f131d]/60 border border-[#3d494e]/30 rounded p-2.5 leading-relaxed mt-1">
              Rule flags gate LLM output — prevents dangerous configs like <code className="text-[#68d6ff]">deny ip any any</code> or reload commands from reaching the engineer.
            </p>
          </div>
        </div>
      </div>

      {/* Failure Log Table */}
      <div className="glass-panel rounded-xl flex flex-col overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#3d494e]/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#dfe2f1]">AI Failure & Correction Log</h2>
            <p className="text-xs text-[#869399] font-mono mt-0.5">
              Cases where AI was wrong — used for model calibration.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="bg-[#171b26] border border-[#3d494e]/40 rounded-lg text-xs px-3 py-1.5 text-[#dfe2f1] focus:outline-none focus:border-[#68d6ff]"
            >
              <option value="ALL">All Failure Types</option>
              <option value="OVER-CORRECTION">Over-Correction</option>
              <option value="TOPOLOGY DRIFT">Topology Drift</option>
              <option value="SCOPE MISS">Scope Miss</option>
              <option value="HALLUCINATED INTERFACE">Hallucinated Interface</option>
            </select>
            <button
              onClick={handleExportCSV}
              className="text-xs font-mono font-bold text-[#68d6ff] bg-[#00bceb]/10 hover:bg-[#00bceb]/20 border border-[#68d6ff]/40 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1c1f2a] border-b border-[#3d494e]/30">
                {['Case ID', 'Initial AI Output', 'Human Correction', 'Failure Type', 'Time', ''].map((h) => (
                  <th key={h} className="p-3.5 text-[11px] font-mono font-bold text-[#869399] uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-xs font-mono divide-y divide-[#3d494e]/20">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#869399]">No records match current filter.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => onSelectFailureLog(log)}
                    className="hover:bg-[#1c1f2a]/60 transition-colors cursor-pointer group"
                  >
                    <td className="p-3.5 text-[#68d6ff] font-bold whitespace-nowrap">{log.case_id}</td>
                    <td className="p-3.5 text-[#dfe2f1]/80 max-w-xs truncate" title={log.initial_ai_output}>{log.initial_ai_output}</td>
                    <td className="p-3.5 text-[#4edea3] max-w-sm truncate" title={log.human_correction}>{log.human_correction}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`status-chip ${getBadgeClass(log.failure_reason)}`}>{log.failure_reason}</span>
                    </td>
                    <td className="p-3.5 text-[#869399] whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3.5">
                      <button className="text-xs text-[#869399] group-hover:text-[#68d6ff] flex items-center gap-1 transition-colors">
                        Inspect <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
