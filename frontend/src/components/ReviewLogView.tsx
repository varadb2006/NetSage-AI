import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowRight,
  Download,
  FileCheck
} from 'lucide-react';
import { ReviewLogEntry } from '../types';

interface ReviewLogViewProps {
  reviewLogs: ReviewLogEntry[];
  onAddToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

export const ReviewLogView: React.FC<ReviewLogViewProps> = ({
  reviewLogs,
  onAddToast
}) => {
  const [filterOutcome, setFilterOutcome] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<ReviewLogEntry | null>(null);

  const filteredLogs = reviewLogs.filter((log) => {
    const matchesFilter = filterOutcome === 'ALL' || log.outcome === filterOutcome;
    const matchesSearch =
      log.case_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.device.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.engineer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#00a572]/20 text-[#4edea3] border border-[#4edea3]/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ACCEPTED (100%)
          </span>
        );
      case 'OVERRIDDEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#f19b03]/20 text-[#ffbc69] border border-[#f19b03]/40">
            <AlertTriangle className="w-3.5 h-3.5" />
            HUMAN OVERRIDE
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#93000a]/20 text-[#ffb4ab] border border-[#ffb4ab]/40">
            <XCircle className="w-3.5 h-3.5" />
            REJECTED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1440px] mx-auto w-full pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#dfe2f1] flex items-center gap-2.5">
            <FileCheck className="w-6 h-6 text-[#68d6ff]" />
            Human-in-the-Loop Review Audit Log
          </h1>
          <p className="text-sm text-[#bcc8cf] mt-1">
            Complete compliance trail of all AI recommendations inspected, modified, or approved by Network Engineers.
          </p>
        </div>

        {/* Audit Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-[#171b26] border border-[#3d494e]/30 px-3.5 py-2 rounded-xl text-xs font-mono">
            <span className="text-[#869399]">TOTAL REVIEWS: </span>
            <span className="text-[#68d6ff] font-bold">{reviewLogs.length}</span>
          </div>
          <div className="bg-[#171b26] border border-[#3d494e]/30 px-3.5 py-2 rounded-xl text-xs font-mono">
            <span className="text-[#869399]">ACCEPTANCE: </span>
            <span className="text-[#4edea3] font-bold">
              {Math.round((reviewLogs.filter((l) => l.outcome === 'ACCEPTED').length / (reviewLogs.length || 1)) * 100)}%
            </span>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shadow-lg">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#869399]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Case ID, device, title, or engineer..."
            className="w-full bg-[#0f131d] border border-[#3d494e]/40 rounded-lg pl-9 pr-4 py-2 text-xs text-[#dfe2f1] placeholder-[#869399] focus:outline-none focus:border-[#68d6ff]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#869399]" />
          <div className="flex bg-[#0f131d] p-1 rounded-lg border border-[#3d494e]/40 text-xs">
            {['ALL', 'ACCEPTED', 'OVERRIDDEN', 'REJECTED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterOutcome(tab)}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${
                  filterOutcome === tab
                    ? 'bg-[#00bceb] text-[#003545]'
                    : 'text-[#869399] hover:text-[#dfe2f1]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Review Cards List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredLogs.map((entry) => (
          <div
            key={entry.id}
            onClick={() => setSelectedEntry(entry)}
            className="glass-panel rounded-xl p-5 hover:border-[#68d6ff]/40 transition-all duration-200 cursor-pointer shadow-lg group"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 pb-3 border-b border-[#3d494e]/20">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-[#68d6ff]">
                  #{entry.case_id}
                </span>
                <span className="text-sm font-semibold text-[#dfe2f1] group-hover:text-[#68d6ff] transition-colors">
                  {entry.title}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#171b26] text-[11px] font-mono text-[#bcc8cf] border border-[#3d494e]/30">
                  {entry.device}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {getOutcomeBadge(entry.outcome)}
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#869399]">
                  <Clock className="w-3.5 h-3.5" />
                  {entry.timestamp}
                </div>
              </div>
            </div>

            {/* Side-by-side snippet preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="bg-[#0f131d] border border-[#3d494e]/30 rounded-lg p-3">
                <div className="text-[10px] font-mono font-bold text-[#869399] uppercase mb-1">
                  AI Recommendation
                </div>
                <pre className="font-mono text-xs text-[#bcc8cf] truncate">
                  {entry.ai_suggested_fix}
                </pre>
              </div>

              <div className="bg-[#0f131d] border border-[#00a572]/30 rounded-lg p-3">
                <div className="text-[10px] font-mono font-bold text-[#4edea3] uppercase mb-1">
                  Final Human Authorized Fix
                </div>
                <pre className="font-mono text-xs text-[#4edea3] truncate">
                  {entry.final_fix_applied}
                </pre>
              </div>
            </div>

            {/* Engineer rationale bar */}
            {entry.human_rationale && (
              <div className="mt-3 text-xs font-mono text-[#869399] bg-[#171b26]/50 px-3 py-2 rounded border border-[#3d494e]/20 flex items-center justify-between">
                <div>
                  <span className="text-[#68d6ff] font-bold">Engineer Rationale: </span>
                  {entry.human_rationale}
                </div>
                <span className="text-[11px] text-[#bcc8cf]">
                  Signed off by: {entry.engineer} ({entry.time_to_resolve})
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected Entry Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#171b26] border border-[#68d6ff]/40 rounded-xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-[#3d494e]/30">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#68d6ff]">
                    #{selectedEntry.case_id}
                  </span>
                  {getOutcomeBadge(selectedEntry.outcome)}
                </div>
                <h3 className="text-lg font-bold text-[#dfe2f1] mt-1">
                  {selectedEntry.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-[#869399] hover:text-[#dfe2f1] text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[#0f131d] p-3 rounded-lg border border-[#3d494e]/40">
                <span className="text-[10px] font-mono text-[#869399] uppercase">Device</span>
                <p className="font-mono text-xs text-[#dfe2f1] font-bold">{selectedEntry.device}</p>
              </div>
              <div className="bg-[#0f131d] p-3 rounded-lg border border-[#3d494e]/40">
                <span className="text-[10px] font-mono text-[#869399] uppercase">Sign-Off Engineer</span>
                <p className="font-mono text-xs text-[#dfe2f1] font-bold">{selectedEntry.engineer}</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <span className="text-xs font-mono text-[#869399]">AI Proposed Payload:</span>
                <pre className="mt-1 bg-black p-3 rounded border border-[#3d494e]/40 font-mono text-xs text-[#bcc8cf] whitespace-pre-wrap">
                  {selectedEntry.ai_suggested_fix}
                </pre>
              </div>

              <div>
                <span className="text-xs font-mono text-[#4edea3] font-bold">Authorized Deployed CLI Payload:</span>
                <pre className="mt-1 bg-black p-3 rounded border border-[#00a572]/40 font-mono text-xs text-[#4edea3] whitespace-pre-wrap">
                  {selectedEntry.final_fix_applied}
                </pre>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 bg-[#262a35] hover:bg-[#313540] text-xs font-semibold rounded-lg text-[#dfe2f1]"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
