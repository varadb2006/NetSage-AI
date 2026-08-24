import React, { useEffect, useRef, useState } from 'react';
import { TopNavBar } from './components/TopNavBar';
import { ActiveDiagnosis } from './components/ActiveDiagnosis';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ReviewLogView } from './components/ReviewLogView';
import { CaseDetailsModal } from './components/CaseDetailsModal';
import { ToastContainer } from './components/Toast';
import { useCases } from './hooks/useCases';
import { fetchMetrics, runDiagnosis, startCustomCase, submitReview, DiagnosticTurn, DashboardMetrics } from './services/api';
import { toLegacyCase } from './data/liveCaseAdapter';
import { TabType, LabCase, FailureLogEntry, ReviewLogEntry, ToastMessage, FailureReason } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const { cases, activeCase, sessionId, loading, selectCase } = useCases();
  const [diagnosis, setDiagnosis] = useState<DiagnosticTurn | null>(null);
  const [failureLogs, setFailureLogs] = useState<FailureLogEntry[]>([]);
  const [reviewLogs, setReviewLogs] = useState<ReviewLogEntry[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [diagnosisCaseId, setDiagnosisCaseId] = useState<string | null>(null);
  const [diagnosisSessionId, setDiagnosisSessionId] = useState<string | null>(null);
  const [inspectedFailureLog, setInspectedFailureLog] = useState<FailureLogEntry | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const firstSessionStarted = useRef(false);

  const addToast = (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  };

  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    if (cases.length > 0 && !firstSessionStarted.current) {
      firstSessionStarted.current = true;
      void selectCase(cases[0]);
    }
  }, [cases, selectCase]);

  useEffect(() => {
    void fetchMetrics().then((metrics) => {
      setMetrics(metrics);
      setFailureLogs(metrics.failure_log.map((entry) => ({ ...entry, failure_reason: entry.failure_reason as FailureReason })));
      setReviewLogs(metrics.review_log);
    }).catch(() => {
      // The diagnosis screen remains usable when the optional metrics request fails.
    });
  }, []);

  const handleSelectCase = (caseItem: LabCase) => {
    const selected = cases.find((item) => item.id === caseItem.id);
    if (!selected) return;
    setDiagnosis(null);
    setDiagnosisCaseId(selected.id);
    void selectCase(selected);
  };

  const handleRunDiagnosis = async (symptom: string, cliLogs: string) => {
    if (!activeCase || !sessionId) {
      addToast('warning', 'Session Starting', 'Please wait for the case session to finish starting.');
      return null;
    }
    try {
      const result = await runDiagnosis(activeCase.id, { session_id: sessionId, symptom, cli_logs: cliLogs });
        setDiagnosisCaseId(activeCase.id);
        setDiagnosisSessionId(sessionId);
      setDiagnosis(result);
      return result;
    } catch (error) {
      const detail = error as { detail?: string };
      addToast('error', 'Diagnosis Failed', detail.detail || 'The backend could not process this diagnosis.');
      return null;
    }
  };

  const handleRunCustomDiagnosis = async (device: string, symptom: string, cliLogs: string) => {
    try {
      const custom = await startCustomCase({ device, symptom, cli_logs: cliLogs });
      setDiagnosisCaseId(custom.case_id);
      setDiagnosisSessionId(custom.session_id);
      const result = await runDiagnosis(custom.case_id, {
        session_id: custom.session_id,
        symptom,
        cli_logs: cliLogs,
      });
      setDiagnosis(result);
      return result;
    } catch (error) {
      const detail = error as { detail?: string };
      addToast('error', 'Custom Diagnosis Failed', detail.detail || 'The backend could not process this custom diagnosis.');
      return null;
    }
  };

  const refreshMetrics = async () => {
    const metrics = await fetchMetrics();
    setMetrics(metrics);
    setFailureLogs(metrics.failure_log.map((entry) => ({ ...entry, failure_reason: entry.failure_reason as FailureReason })));
    setReviewLogs(metrics.review_log);
  };

  const handleReview = async (caseItem: LabCase, action: 'ACCEPT' | 'EDIT' | 'REJECT', finalFix?: string, rationale?: string, reason?: FailureReason) => {
    const reviewSessionId = diagnosisSessionId ?? sessionId;
    const reviewCaseId = diagnosisCaseId ?? caseItem.id;
    if (!reviewSessionId) {
      addToast('warning', 'Session Unavailable', 'Start a case session before submitting a review.');
      return;
    }
    try {
      await submitReview(reviewCaseId, {
        session_id: reviewSessionId,
        action,
        final_fix: finalFix,
        human_rationale: rationale,
        failure_reason: reason,
        correction_notes: rationale,
      });
      await refreshMetrics();
    } catch (error) {
      const detail = error as { detail?: string };
      addToast('error', 'Review Failed', detail.detail || 'The backend could not record this review.');
    }
  };

  const handleRejectFix = (caseItem: LabCase, reason: FailureReason, comment: string) => {
    void handleReview(caseItem, 'REJECT', undefined, comment, reason);
  };

  const handleAcceptFix = (caseItem: LabCase, finalScript: string, rationale?: string) => {
    void handleReview(caseItem, 'ACCEPT', finalScript, rationale);
  };

  const handleEditFix = (caseItem: LabCase, finalScript: string, rationale?: string) => {
    void handleReview(caseItem, 'EDIT', finalScript, rationale);
  };

  if (loading || !activeCase) {
    return <div className="min-h-screen bg-[#0f131d] text-[#dfe2f1] flex items-center justify-center font-mono">Loading cases...</div>;
  }

  const liveCases = cases.map((item) => toLegacyCase(item, item.id === activeCase.id ? sessionId ?? '' : '', item.id === activeCase.id ? diagnosis : null));
  const liveActiveCase = toLegacyCase(activeCase, sessionId ?? '', diagnosis);

  return (
    <div className="min-h-screen bg-[#0f131d] text-[#dfe2f1] flex flex-col font-sans overflow-x-hidden">
      <TopNavBar activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 pt-14 px-5 pb-8 md:px-10">
        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            failureLogs={failureLogs}
            metrics={metrics}
            onSelectFailureLog={(entry) => setInspectedFailureLog(entry)}
            onAddToast={addToast}
          />
        )}

        {activeTab === 'diagnosis' && (
          <ActiveDiagnosis
            cases={liveCases}
            activeCase={liveActiveCase}
            onSelectCase={handleSelectCase}
            onAcceptFix={handleAcceptFix}
            onEditFix={handleEditFix}
            onRejectFix={handleRejectFix}
            onRunDiagnosis={handleRunDiagnosis}
            onRunCustomDiagnosis={handleRunCustomDiagnosis}
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
