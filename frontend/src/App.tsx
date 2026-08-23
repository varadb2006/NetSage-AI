import React, { useState } from 'react';
import { TopNavBar } from './components/TopNavBar';
import { ActiveDiagnosis } from './components/ActiveDiagnosis';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ReviewLogView } from './components/ReviewLogView';
import { CaseDetailsModal } from './components/CaseDetailsModal';
import { ToastContainer } from './components/Toast';
import { INITIAL_FAILURE_LOGS, INITIAL_REVIEW_LOGS, MOCK_CASES } from './data/mockCases';
import { TabType, LabCase, FailureLogEntry, ReviewLogEntry, ToastMessage, FailureReason } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('analytics');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cases] = useState<any[]>(MOCK_CASES);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeCase, setActiveCase] = useState<any>(MOCK_CASES[0]);

  const [failureLogs, setFailureLogs] = useState<FailureLogEntry[]>(INITIAL_FAILURE_LOGS);
  const [reviewLogs, setReviewLogs] = useState<ReviewLogEntry[]>(INITIAL_REVIEW_LOGS);
  const [inspectedFailureLog, setInspectedFailureLog] = useState<FailureLogEntry | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  };

  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const handleAcceptFix = (caseItem: LabCase, finalScript: string, rationale?: string) => {
    const entry: ReviewLogEntry = {
      id: `rev-${Date.now()}`,
      case_id: caseItem.id,
      title: caseItem.title,
      device: caseItem.device,
      outcome: 'ACCEPTED',
      ai_suggested_fix: '',
      final_fix_applied: finalScript,
      human_rationale: rationale || 'Verified and approved by network engineer.',
      engineer: 'Network Engineer',
      timestamp: `${new Date().toISOString().slice(11, 19)} UTC`,
      time_to_resolve: '1.2 min'
    };
    setReviewLogs((prev) => [entry, ...prev]);
  };

  const handleRejectFix = (caseItem: LabCase, reason: FailureReason, comment: string) => {
    const failure: FailureLogEntry = {
      id: `fl-${Date.now()}`,
      case_id: `#CAS-${Math.floor(1000 + Math.random() * 9000)}`,
      case_title: caseItem.title,
      initial_ai_output: '',
      human_correction: comment,
      failure_reason: reason,
      timestamp: `${new Date().toISOString().slice(11, 19)} UTC`,
      device: caseItem.device,
      engineer: 'Network Engineer'
    };
    setFailureLogs((prev) => [failure, ...prev]);

    const review: ReviewLogEntry = {
      id: `rev-${Date.now()}`,
      case_id: caseItem.id,
      title: caseItem.title,
      device: caseItem.device,
      outcome: 'REJECTED',
      ai_suggested_fix: '',
      final_fix_applied: 'REJECTED BY OPERATOR',
      human_rationale: `Rejected due to ${reason}: ${comment}`,
      engineer: 'Network Engineer',
      timestamp: `${new Date().toISOString().slice(11, 19)} UTC`,
      time_to_resolve: '0.8 min'
    };
    setReviewLogs((prev) => [review, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#0f131d] text-[#dfe2f1] flex flex-col font-sans overflow-x-hidden">
      <TopNavBar activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 pt-14 px-5 pb-8 md:px-10">
        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            failureLogs={failureLogs}
            onSelectFailureLog={(entry) => setInspectedFailureLog(entry)}
            onAddToast={addToast}
          />
        )}

        {activeTab === 'diagnosis' && (
          <ActiveDiagnosis
            cases={cases}
            activeCase={activeCase}
            onSelectCase={setActiveCase}
            onAcceptFix={handleAcceptFix}
            onRejectFix={handleRejectFix}
            onAddToast={addToast}
          />
        )}

        {activeTab === 'review_log' && (
          <ReviewLogView reviewLogs={reviewLogs} onAddToast={addToast} />
        )}
      </main>

      <CaseDetailsModal
        entry={inspectedFailureLog}
        onClose={() => setInspectedFailureLog(null)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
