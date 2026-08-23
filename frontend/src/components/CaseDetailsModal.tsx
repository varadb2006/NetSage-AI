import React from 'react';
import { X, AlertTriangle, ShieldCheck, User, Calendar, Cpu, ArrowRight } from 'lucide-react';
import { FailureLogEntry } from '../types';

interface CaseDetailsModalProps {
  entry: FailureLogEntry | null;
  onClose: () => void;
  onLoadIntoDiagnosis?: (caseId: string) => void;
}

export const CaseDetailsModal: React.FC<CaseDetailsModalProps> = ({
  entry,
  onClose,
  onLoadIntoDiagnosis
}) => {
  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[#171b26] border border-[#ffb4ab]/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#3d494e]/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#93000a]/20 border border-[#ffb4ab]/30">
              <AlertTriangle className="w-5 h-5 text-[#ffb4ab]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#68d6ff]">
                  {entry.case_id}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#93000a]/30 text-[#ffb4ab] border border-[#ffb4ab]/40">
                  {entry.failure_reason}
                </span>
              </div>
              <h2 className="text-base font-bold text-[#dfe2f1] mt-0.5">
                {entry.case_title || 'Incident Inspection'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#869399] hover:text-[#dfe2f1] p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4 text-xs font-mono">
          <div className="bg-[#0f131d] p-3 rounded-lg border border-[#3d494e]/30">
            <span className="text-[10px] text-[#869399] uppercase">Device</span>
            <div className="text-[#dfe2f1] font-bold flex items-center gap-1.5 mt-0.5">
              <Cpu className="w-3.5 h-3.5 text-[#68d6ff]" />
              {entry.device}
            </div>
          </div>

          <div className="bg-[#0f131d] p-3 rounded-lg border border-[#3d494e]/30">
            <span className="text-[10px] text-[#869399] uppercase">Timestamp</span>
            <div className="text-[#dfe2f1] font-bold flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-[#ffbc69]" />
              {entry.timestamp}
            </div>
          </div>

          <div className="bg-[#0f131d] p-3 rounded-lg border border-[#3d494e]/30">
            <span className="text-[10px] text-[#869399] uppercase">Reviewer</span>
            <div className="text-[#dfe2f1] font-bold flex items-center gap-1.5 mt-0.5">
              <User className="w-3.5 h-3.5 text-[#4edea3]" />
              {entry.engineer}
            </div>
          </div>
        </div>

        {/* Comparison Details */}
        <div className="space-y-3 mb-5 text-xs font-mono">
          <div className="bg-[#0f131d] border border-[#3d494e]/40 rounded-xl p-3.5">
            <span className="text-[10px] font-bold uppercase text-[#869399]">
              1. Initial AI Generation Output:
            </span>
            <p className="mt-1 text-[#ffb4ab] leading-relaxed">
              {entry.initial_ai_output}
            </p>
          </div>

          <div className="bg-[#0f131d] border border-[#00a572]/40 rounded-xl p-3.5">
            <span className="text-[10px] font-bold uppercase text-[#4edea3]">
              2. Human Expert Corrective Action:
            </span>
            <p className="mt-1 text-[#4edea3] leading-relaxed">
              {entry.human_correction}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-[#3d494e]/20">
          <div className="text-[11px] font-mono text-[#869399]">
            Incident registered in Model Fine-Tuning Batch #409
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#262a35] hover:bg-[#313540] text-[#dfe2f1]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
