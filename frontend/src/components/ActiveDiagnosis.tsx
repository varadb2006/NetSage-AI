import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Terminal as TerminalIcon,
  Layers,
  ShieldCheck,
  Send,
  X,
  Edit2,
  Check,
  Bot,
  BookOpen,
  FileEdit,
  Copy,
  ArrowLeftRight,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sliders,
  PlusCircle,
  FolderOpen,
} from 'lucide-react';
import { LabCase, ConfidenceState, FailureReason } from '../types';

/**
 * LegacyLabCase — extends the slim LabCase with mock-era fields.
 * TODO (Module 5): Remove this and replace with DiagnosticTurn from api.ts.
 */
interface LegacyLabCase extends LabCase {
  sessionId: string;
  targetDevice: string;
  defaultConfidence: ConfidenceState;
  terminalInitial: string;
  quickCommands: { command: string; output: string }[];
  nextSuggestedAction: { command: string; rationale: string; expectedOutcome: string };
  aiSuggestedFix: { rootCause: string; fixScript: string };
  actualKnownFix: { title: string; steps: string[]; script: string };
  defaultHumanOverride: string;
  finalScript: { ai: string[]; override: string[] };
  osiFault: { layer: number; name: string; confidence: number };
  deterministicAgreement: { status: string; rule: string };
}

interface ActiveDiagnosisProps {
  cases: LegacyLabCase[];
  activeCase: LegacyLabCase;
  onSelectCase: (c: LegacyLabCase) => void;
  onAcceptFix: (caseItem: LegacyLabCase, finalScript: string, rationale?: string) => void;
  onRejectFix: (caseItem: LegacyLabCase, reason: FailureReason, comment: string) => void;
  onAddToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

export const ActiveDiagnosis: React.FC<ActiveDiagnosisProps> = ({
  cases,
  activeCase,
  onSelectCase,
  onAcceptFix,
  onRejectFix,
  onAddToast
}) => {
  // Local state for symptoms, terminal, engine run state, and human override editor
  const [symptoms, setSymptoms] = useState(activeCase.symptoms);
  const [terminalHistory, setTerminalHistory] = useState(activeCase.terminalInitial);
  const [terminalInput, setTerminalInput] = useState('');
  
  // Diagnostic Engine State
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticStep, setDiagnosticStep] = useState('');
  const [hasRunDiagnosis, setHasRunDiagnosis] = useState(true);
  const [confidenceState, setConfidenceState] = useState<ConfidenceState>(activeCase.defaultConfidence);
  
  // Suggested Next Command input
  const [suggestedCommand, setSuggestedCommand] = useState(activeCase.nextSuggestedAction.command);
  
  // Human Override Editor
  const [humanOverrideText, setHumanOverrideText] = useState(activeCase.defaultHumanOverride);
  const [useAiScript, setUseAiScript] = useState(false);
  const [isEditingOverride, setIsEditingOverride] = useState(false);

  // Reject Modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState<FailureReason>('OVER-CORRECTION');
  const [rejectComment, setRejectComment] = useState('');

  // New Input mode
  const [inputMode, setInputMode] = useState<'load' | 'new'>('load');
  const [newDevice, setNewDevice] = useState('');
  const [newSymptoms, setNewSymptoms] = useState('');
  const [newCliLogs, setNewCliLogs] = useState('');

  // Sync state when active case changes
  useEffect(() => {
    setSymptoms(activeCase.symptoms);
    setTerminalHistory(activeCase.terminalInitial);
    setSuggestedCommand(activeCase.nextSuggestedAction.command);
    setHumanOverrideText(activeCase.defaultHumanOverride);
    setConfidenceState(activeCase.defaultConfidence);
    setHasRunDiagnosis(true);
    setUseAiScript(false);
    setIsEditingOverride(false);
  }, [activeCase]);

  const handleRunDiagnosticEngine = () => {
    if (inputMode === 'new' && !newDevice.trim()) {
      onAddToast('error', 'Device Required', 'Enter a device name before running diagnosis.');
      return;
    }
    if (inputMode === 'new' && !newSymptoms.trim()) {
      onAddToast('error', 'Symptoms Required', 'Describe the fault symptom before running diagnosis.');
      return;
    }
    setIsDiagnosing(true);
    setDiagnosticStep('Streaming NetFlow & Syslog telemetry...');
    const step1 = setTimeout(() => setDiagnosticStep('Evaluating deterministic IOS heuristics...'), 500);
    const step2 = setTimeout(() => setDiagnosticStep('Localizing OSI fault & calculating confidence...'), 1100);
    const step3 = setTimeout(() => setDiagnosticStep('Synthesizing idempotent CLI mitigation patch...'), 1600);
    const finish = setTimeout(() => {
      setIsDiagnosing(false);
      setHasRunDiagnosis(true);
      setDiagnosticStep('');
      const device = inputMode === 'new' ? newDevice : activeCase.targetDevice;
      onAddToast('success', 'Diagnostic Engine Completed', `Evaluated ${device} against 140+ Cisco IOS heuristics.`);
    }, 2000);
    return () => { clearTimeout(step1); clearTimeout(step2); clearTimeout(step3); clearTimeout(finish); };
  };

  // Run a terminal quick command
  const handleQuickCommand = (cmdStr: string) => {
    const matched = activeCase.quickCommands.find(
      (c) => c.command.toLowerCase() === cmdStr.toLowerCase()
    );
    const output = matched ? matched.output : `% Command '${cmdStr}' executed on ${activeCase.targetDevice}.\nNo anomalies detected.`;
    
    setTerminalHistory((prev) => `${prev.trim()}\n${activeCase.targetDevice}# ${cmdStr}\n${output}\n\n${activeCase.targetDevice}# `);
    onAddToast('info', `CLI Executed: ${cmdStr}`, `Output captured in ${activeCase.targetDevice} buffer.`);
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    handleQuickCommand(terminalInput.trim());
    setTerminalInput('');
  };

  // Submit next suggested action command (State A -> State B progression)
  const handleSubmitSuggestedAction = () => {
    const cmd = suggestedCommand.trim();
    handleQuickCommand(cmd);
    // Transition to High Confidence once evidence is gathered
    setConfidenceState('high');
    onAddToast(
      'success',
      'Telemetry Refreshed',
      `Gathered evidence for '${cmd}'. Diagnostic confidence escalated to HIGH (98%).`
    );
  };

  // Copy Fix Script
  const handleCopyFix = () => {
    const scriptToCopy = useAiScript
      ? activeCase.finalScript.ai.join('\n')
      : humanOverrideText || activeCase.finalScript.override.join('\n');
    navigator.clipboard.writeText(scriptToCopy);
    onAddToast('success', 'CLI Fix Copied to Clipboard', 'Ready to paste into Cisco IOS privileged exec mode.');
  };

  // Human Review: Accept
  const handleAccept = () => {
    const finalScript = useAiScript
      ? activeCase.finalScript.ai.join('\n')
      : humanOverrideText;
    onAcceptFix(activeCase, finalScript, 'Approved by Network Engineer review.');
    onAddToast('success', 'Diagnosis Accepted!', `Fix staged for ${activeCase.targetDevice}. Logged to Human Review Audit.`);
  };

  // Human Review: Edit
  const handleEditClick = () => {
    setIsEditingOverride(true);
    setUseAiScript(false);
    onAddToast('info', 'Edit Mode Active', 'You can customize the Human Override CLI script before final sign-off.');
  };

  // Human Review: Confirm Reject
  const handleConfirmReject = () => {
    setShowRejectModal(false);
    onRejectFix(activeCase, rejectReason, rejectComment || 'Manual override required by engineer.');
    onAddToast('warning', 'Diagnosis Rejected', 'Incident captured into Responsible AI Failure Log for model calibration.');
    setRejectComment('');
  };

  // Compute final script lines to display
  const activeScriptLines = useAiScript
    ? activeCase.finalScript.ai
    : humanOverrideText.split('\n');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1440px] mx-auto w-full pb-10">
      {/* ================= LEFT COLUMN: INPUT & EVIDENCE ================= */}
      <section className="lg:col-span-6 flex flex-col gap-4">
        {/* Context Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#dfe2f1]">
              Active Session
            </h1>
            <p className="text-xs text-[#869399] mt-0.5 font-mono">
              Live Cisco IOS Diagnostic Workspace & Evidence Collector
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#171b26] px-3 py-1.5 rounded-lg border border-[#3d494e]/30">
            <span className="text-[11px] font-mono font-bold text-[#869399]">
              SESSION ID:
            </span>
            <span className="text-xs font-mono font-bold text-[#68d6ff]">
              {activeCase.sessionId}
            </span>
          </div>
        </div>

        {/* Input Mode Tabs */}
        <div className="flex items-center bg-[#0f131d] rounded-xl border border-[#3d494e]/30 p-1 gap-1">
          <button
            onClick={() => setInputMode('load')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              inputMode === 'load'
                ? 'bg-[#262a35] text-[#68d6ff] shadow-sm'
                : 'text-[#869399] hover:text-[#dfe2f1]'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Load Case
          </button>
          <button
            onClick={() => setInputMode('new')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              inputMode === 'new'
                ? 'bg-[#262a35] text-[#4edea3] shadow-sm'
                : 'text-[#869399] hover:text-[#dfe2f1]'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Input
          </button>
        </div>

        {/* Conditional: Load Case Panel */}
        {inputMode === 'load' ? (
        <div className="glass-panel rounded-xl p-4 flex flex-col gap-3.5 shadow-lg">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono font-bold text-[#bcc8cf] uppercase tracking-wider flex items-center justify-between">
              <span>Target Environment / Lab Case</span>
              <span className="text-[10px] text-[#68d6ff] font-normal lowercase">({cases.length} cases loaded)</span>
            </label>
            <select
              value={activeCase.id}
              onChange={(e) => {
                const found = cases.find((c) => c.id === e.target.value);
                if (found) onSelectCase(found);
              }}
              className="w-full bg-[#0f131d] border border-[#3d494e]/40 rounded-lg text-sm px-3.5 py-2.5 text-[#dfe2f1] focus:outline-none focus:border-[#68d6ff] transition-all cursor-pointer"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.title} ({c.targetDevice})</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono font-bold text-[#bcc8cf] uppercase tracking-wider flex items-center justify-between">
              <span>Reported Symptoms</span>
              <span className="text-[10px] text-[#869399]">Editable</span>
            </label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Enter observed telemetry or symptom descriptions..."
              className="w-full bg-[#0f131d] border border-[#3d494e]/40 rounded-lg text-xs px-3.5 py-2.5 text-[#dfe2f1] placeholder-[#869399] focus:outline-none focus:border-[#68d6ff] transition-all h-20 resize-none font-sans leading-relaxed"
            />
          </div>
        </div>
        ) : (
        /* New Input Panel */
        <div className="glass-panel rounded-xl p-4 flex flex-col gap-3.5 shadow-lg border border-[#4edea3]/20">
          <div className="flex items-center gap-2 mb-1">
            <PlusCircle className="w-4 h-4 text-[#4edea3]" />
            <span className="text-xs font-semibold text-[#4edea3]">Custom Diagnosis Input</span>
            <span className="text-[10px] font-mono text-[#869399] ml-auto">Free-form — any Cisco device</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono font-bold text-[#bcc8cf] uppercase tracking-wider">Device / Hostname</label>
            <input
              type="text"
              value={newDevice}
              onChange={(e) => setNewDevice(e.target.value)}
              placeholder="e.g. R1, Core-Switch-01, Edge-Router"
              className="w-full bg-[#0f131d] border border-[#3d494e]/40 rounded-lg text-sm px-3.5 py-2.5 text-[#dfe2f1] placeholder-[#869399] focus:outline-none focus:border-[#4edea3] transition-all font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono font-bold text-[#bcc8cf] uppercase tracking-wider">Fault Symptom</label>
            <textarea
              value={newSymptoms}
              onChange={(e) => setNewSymptoms(e.target.value)}
              placeholder="Describe what's failing: e.g. VLAN 10 hosts cannot ping gateway, BGP neighborship flapping..."
              className="w-full bg-[#0f131d] border border-[#3d494e]/40 rounded-lg text-xs px-3.5 py-2.5 text-[#dfe2f1] placeholder-[#869399] focus:outline-none focus:border-[#4edea3] transition-all h-16 resize-none font-sans leading-relaxed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono font-bold text-[#bcc8cf] uppercase tracking-wider flex items-center justify-between">
              <span>Raw CLI Output (paste show commands)</span>
              <button
                onClick={() => setNewCliLogs('')}
                className="text-[10px] text-[#869399] hover:text-[#ffb4ab] font-mono transition-colors"
              >
                Clear
              </button>
            </label>
            <textarea
              value={newCliLogs}
              onChange={(e) => setNewCliLogs(e.target.value)}
              placeholder={`Paste output from:\n  show ip int brief\n  show run\n  show ip route\n  show interfaces\n  show vlan brief\n  ...`}
              className="w-full bg-black border border-[#3d494e]/40 rounded-lg text-xs px-3.5 py-2.5 text-[#4edea3] placeholder-[#3d494e] focus:outline-none focus:border-[#4edea3] transition-all h-36 resize-y font-mono leading-relaxed"
            />
          </div>
        </div>
        )}

        {/* Interactive Terminal UI */}
        <div className="flex flex-col h-80 border border-[#3d494e]/40 rounded-xl overflow-hidden bg-black relative shadow-2xl">
          {/* Terminal Title Bar */}
          <div className="flex items-center justify-between bg-[#262a35] border-b border-[#3d494e]/30 px-3.5 py-2">
            <div className="flex items-center gap-2 text-[#bcc8cf]">
              <TerminalIcon className="w-4 h-4 text-[#68d6ff]" />
              <span className="font-mono text-xs font-semibold text-[#dfe2f1]">
                Cisco IOS - {activeCase.targetDevice}
              </span>
            </div>
            {/* Quick Command Action Buttons */}
            <div className="flex gap-1.5 flex-wrap">
              {activeCase.quickCommands.map((qc) => (
                <button
                  key={qc.command}
                  onClick={() => handleQuickCommand(qc.command)}
                  className="px-2 py-0.5 bg-[#0f131d] border border-[#3d494e]/40 rounded text-[11px] font-mono text-[#bcc8cf] hover:border-[#68d6ff] hover:text-[#68d6ff] hover:bg-[#68d6ff]/10 transition-colors"
                  title={`Run: ${qc.command}`}
                >
                  {qc.command.split(' ')[0]} {qc.command.split(' ')[1] || ''}
                </button>
              ))}
            </div>
          </div>

          {/* Terminal Output Area */}
          <div className="flex-1 p-3.5 term-scroll overflow-y-auto relative font-mono text-xs text-[#4edea3] leading-relaxed select-text">
            {/* CRT Scanline Overlay */}
            <div className="absolute inset-0 scanline z-10 pointer-events-none"></div>
            <pre className="relative z-20 whitespace-pre-wrap font-mono text-xs">
              {terminalHistory}
            </pre>
          </div>

          {/* Interactive Command Input line */}
          <form
            onSubmit={handleTerminalSubmit}
            className="flex items-center bg-[#0a0e18] border-t border-[#3d494e]/30 px-3 py-1.5 z-20"
          >
            <span className="text-[#68d6ff] font-mono text-xs mr-2 font-bold">
              {activeCase.targetDevice}#
            </span>
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              placeholder="Type Cisco command (e.g. show run, show ip int brief)..."
              className="flex-1 bg-transparent text-xs font-mono text-[#68d6ff] focus:outline-none placeholder-[#3d494e]"
            />
            <button
              type="submit"
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#171b26] text-[#bcc8cf] hover:text-[#68d6ff] border border-[#3d494e]/30"
            >
              Enter
            </button>
          </form>
        </div>

        {/* Run Diagnostic Engine Button */}
        <button
          onClick={handleRunDiagnosticEngine}
          disabled={isDiagnosing}
          className="w-full bg-[#00bceb] hover:bg-[#5dd4ff] text-[#003545] font-bold text-base py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 relative overflow-hidden group shadow-[0_0_25px_rgba(0,188,235,0.35)] hover:shadow-[0_0_35px_rgba(93,212,255,0.55)] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {/* Shimmer sweep animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          
          {isDiagnosing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-[#003545]" />
              <span>{diagnosticStep || 'Processing Diagnostic Engine...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-[#003545]" />
              <span>Run NetSage Diagnostic Engine</span>
            </>
          )}
        </button>

        {/* Confidence State Mode Switcher (Simulator control) */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#171b26]/60 border border-[#3d494e]/20 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#68d6ff]" />
            <span className="font-mono text-[11px] text-[#bcc8cf]">
              SIMULATION CONFIDENCE MODE:
            </span>
          </div>
          <div className="flex items-center gap-1 bg-[#0f131d] p-1 rounded-md border border-[#3d494e]/30">
            <button
              onClick={() => setConfidenceState('low')}
              className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-colors ${
                confidenceState === 'low'
                  ? 'bg-[#f19b03] text-[#472a00]'
                  : 'text-[#869399] hover:text-[#dfe2f1]'
              }`}
            >
              State A (Low Conf)
            </button>
            <button
              onClick={() => setConfidenceState('high')}
              className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-colors ${
                confidenceState === 'high'
                  ? 'bg-[#00a572] text-[#002113]'
                  : 'text-[#869399] hover:text-[#dfe2f1]'
              }`}
            >
              State B (High Conf)
            </button>
          </div>
        </div>
      </section>

      {/* ================= RIGHT COLUMN: DIAGNOSIS & WORKFLOW ================= */}
      <section className="lg:col-span-6 flex flex-col gap-4">
        {/* OSI & Deterministic Badges Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-h-[160px]">
          {/* OSI Fault Localization Card */}
          <div className="glass-panel rounded-xl p-3.5 flex flex-col justify-between border-l-4 border-[#f19b03] relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
              <Layers className="w-16 h-16 text-[#68d6ff]" />
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-mono font-bold text-[#bcc8cf] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#ffbc69]" />
                OSI Fault Localization
              </h3>
            </div>

            {/* OSI Layers Visualizer */}
            <div className="flex flex-col gap-1 z-10 font-mono text-xs">
              <div className="flex justify-between items-center px-2 py-0.5 rounded bg-[#0f131d]/60 text-[#869399]">
                <span className="w-4 text-[#869399]">7</span> <span>Application</span>
              </div>
              <div className={`flex justify-between items-center px-2 py-0.5 rounded ${
                activeCase.osiFault.layer === 4
                  ? 'bg-[#f19b03]/20 border border-[#f19b03] text-[#ffddb8] font-bold shadow-[0_0_10px_rgba(241,155,3,0.25)]'
                  : 'bg-[#0f131d]/60 text-[#869399]'
              }`}>
                <span className="w-4">4</span> <span>Transport</span>
                {activeCase.osiFault.layer === 4 && (
                  <span className="bg-[#f19b03] text-[#472a00] px-1.5 py-0.2 rounded text-[10px] font-bold">
                    {activeCase.osiFault.confidence}%
                  </span>
                )}
              </div>
              <div className={`flex justify-between items-center px-2 py-0.5 rounded ${
                activeCase.osiFault.layer === 3
                  ? 'bg-[#f19b03]/20 border border-[#f19b03] text-[#ffddb8] font-bold shadow-[0_0_10px_rgba(241,155,3,0.25)]'
                  : 'bg-[#0f131d]/60 text-[#869399]'
              }`}>
                <span className="w-4">3</span> <span>Network</span>
                {activeCase.osiFault.layer === 3 && (
                  <span className="bg-[#f19b03] text-[#472a00] px-1.5 py-0.2 rounded text-[10px] font-bold">
                    {activeCase.osiFault.confidence}%
                  </span>
                )}
              </div>
              <div className={`flex justify-between items-center px-2 py-0.5 rounded ${
                activeCase.osiFault.layer === 2
                  ? 'bg-[#f19b03]/20 border border-[#f19b03] text-[#ffddb8] font-bold shadow-[0_0_10px_rgba(241,155,3,0.25)]'
                  : 'bg-[#0f131d]/60 text-[#869399]'
              }`}>
                <span className="w-4">2</span> <span>Data Link</span>
                {activeCase.osiFault.layer === 2 && (
                  <span className="bg-[#f19b03] text-[#472a00] px-1.5 py-0.2 rounded text-[10px] font-bold">
                    {activeCase.osiFault.confidence}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Deterministic vs AI Agreement Card */}
          <div className="glass-panel rounded-xl p-3.5 flex flex-col justify-center items-center text-center gap-2 border-t border-t-[#3d494e]/30 shadow-lg">
            <div className="p-2 rounded-full bg-[#00a572]/15 border border-[#4edea3]/30">
              <ShieldCheck className="w-6 h-6 text-[#4edea3]" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-[#bcc8cf] uppercase tracking-wider mb-1">
                Deterministic vs AI
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                activeCase.deterministicAgreement.status === 'AGREE'
                  ? 'bg-[#00a572]/20 border border-[#4edea3] text-[#4edea3]'
                  : 'bg-[#93000a]/20 border border-[#ffb4ab] text-[#ffb4ab]'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  activeCase.deterministicAgreement.status === 'AGREE'
                    ? 'bg-[#4edea3] shadow-[0_0_8px_#4edea3]'
                    : 'bg-[#ffb4ab] shadow-[0_0_8px_#ffb4ab]'
                }`}></span>
                AGREEMENT: {activeCase.deterministicAgreement.status}
              </div>
            </div>
            <div className="text-[11px] font-mono text-[#bcc8cf] bg-[#0f131d] px-2.5 py-1 rounded border border-[#3d494e]/30 w-full truncate">
              {activeCase.deterministicAgreement.rule}
            </div>
          </div>
        </div>

        {/* Iterative Flow Box (Next Suggested Action / Command Step) */}
        <div className="glass-panel rounded-xl p-4 border-l-2 border-[#68d6ff] shadow-lg">
          <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-[#3d494e]/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#68d6ff]" />
              <span className="text-[11px] font-mono font-bold text-[#dfe2f1] uppercase tracking-wider">
                Next Suggested Action
              </span>
            </div>
            <span className="text-xs text-[#869399] italic">
              {confidenceState === 'low' ? 'Awaiting input to calibrate confidence...' : 'Command verified'}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={suggestedCommand}
              onChange={(e) => setSuggestedCommand(e.target.value)}
              className="flex-1 bg-black border border-[#3d494e]/50 rounded-lg font-mono text-xs text-[#5dd4ff] px-3.5 py-2.5 focus:outline-none focus:border-[#68d6ff] transition-all"
            />
            <button
              onClick={handleSubmitSuggestedAction}
              className="bg-[#171b26] hover:bg-[#262a35] border border-[#68d6ff] text-[#68d6ff] px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-[0_0_10px_rgba(104,214,255,0.2)] hover:shadow-[0_0_15px_rgba(104,214,255,0.4)] active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              Submit
            </button>
          </div>
          
          <p className="text-[11px] text-[#869399] mt-2 font-mono">
            Rationale: {activeCase.nextSuggestedAction.rationale}
          </p>
        </div>

        {/* Proposed Resolution (Side-by-Side Diff & Review Editor) */}
        <div className="glass-panel rounded-xl p-4 flex-1 flex flex-col shadow-xl">
          {/* Header & Human-in-the-Loop Review Action Buttons */}
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h3 className="text-xl font-bold text-[#dfe2f1]">
                Proposed Resolution
              </h3>
              <p className="text-xs text-[#869399] font-mono">
                Human-in-the-Loop Review & Verification
              </p>
            </div>
            
            {/* Review Action Buttons: Reject, Edit, Accept */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRejectModal(true)}
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#93000a]/20 text-[#ffb4ab] border border-[#ffb4ab]/40 hover:bg-[#93000a] hover:text-[#ffdad6] transition-all"
                title="Reject AI Diagnosis & Log Failure"
              >
                <X className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleEditClick}
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#f19b03]/20 text-[#ffbc69] border border-[#f19b03]/40 hover:bg-[#f19b03] hover:text-[#472a00] transition-all"
                title="Edit Human Override Script"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleAccept}
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#00a572]/25 text-[#4edea3] border border-[#4edea3]/50 hover:bg-[#00a572] hover:text-[#002113] transition-all shadow-[0_0_12px_rgba(78,222,163,0.3)]"
                title="Accept & Approve Diagnosis"
              >
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* 3-Column Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-[160px]">
            {/* 1. AI Suggested Fix */}
            <div className="flex flex-col border border-[#3d494e]/30 rounded-lg bg-[#0f131d]/60 overflow-hidden">
              <div className="px-3 py-1.5 border-b border-[#3d494e]/30 bg-[#262a35] text-[11px] font-mono font-bold text-[#bcc8cf] flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-[#68d6ff]" />
                AI Suggested Fix
              </div>
              <div className="p-3 font-mono text-xs text-[#bcc8cf] overflow-y-auto whitespace-pre-wrap leading-relaxed flex-1">
                {activeCase.aiSuggestedFix.rootCause}
              </div>
            </div>

            {/* 2. Actual Known Fix (Reference) */}
            <div className="flex flex-col border border-[#f19b03]/30 rounded-lg bg-[#f19b03]/5 overflow-hidden">
              <div className="px-3 py-1.5 border-b border-[#f19b03]/20 bg-[#f19b03]/10 text-[11px] font-mono font-bold text-[#ffddb8] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#ffbc69]" />
                Actual Known Fix
              </div>
              <div className="p-3 font-mono text-xs text-[#ffddb8]/90 overflow-y-auto whitespace-pre-wrap leading-relaxed flex-1">
                {activeCase.actualKnownFix.script}
              </div>
            </div>

            {/* 3. Human Override Editor */}
            <div className="flex flex-col border border-[#68d6ff]/30 rounded-lg bg-[#0f131d] overflow-hidden">
              <div className="px-3 py-1.5 border-b border-[#68d6ff]/20 bg-[#00bceb]/10 text-[11px] font-mono font-bold text-[#5dd4ff] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileEdit className="w-3.5 h-3.5 text-[#68d6ff]" />
                  Human Override Editor
                </span>
                <span className="text-[9px] text-[#4edea3] uppercase font-bold">
                  Active
                </span>
              </div>
              <textarea
                value={humanOverrideText}
                onChange={(e) => {
                  setHumanOverrideText(e.target.value);
                  setUseAiScript(false);
                }}
                className="w-full h-full bg-transparent border-none p-3 font-mono text-xs text-[#dfe2f1] resize-none focus:outline-none focus:ring-0 leading-relaxed custom-scrollbar"
                placeholder="Refine final CLI command block here..."
              />
            </div>
          </div>

          {/* 1-Click Fix Box (Final Script Box) */}
          <div className="mt-3.5 border border-[#00a572]/40 rounded-lg overflow-hidden bg-black relative shadow-inner">
            <div className="flex justify-between items-center bg-[#00a572]/10 px-3.5 py-2 border-b border-[#00a572]/20">
              <span className="text-[11px] font-mono font-bold text-[#6ffbbe] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4edea3]" />
                Final Overridden Script
              </span>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setUseAiScript(!useAiScript);
                    onAddToast(
                      'info',
                      useAiScript ? 'Switched to Human Override' : 'Switched to AI Fix',
                      'Active CLI payload updated.'
                    );
                  }}
                  className="text-xs font-mono text-[#bcc8cf] hover:text-[#68d6ff] flex items-center gap-1 transition-colors"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  {useAiScript ? 'Switch to Human Override' : 'Switch to AI Version'}
                </button>
                
                <button
                  onClick={handleCopyFix}
                  className="text-xs font-mono text-[#4edea3] hover:text-[#6ffbbe] flex items-center gap-1 transition-colors font-bold"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Fix
                </button>
              </div>
            </div>

            <div className="p-3.5 font-mono text-xs select-text leading-relaxed">
              {activeScriptLines.map((line, idx) => {
                const isHighlight =
                  line.includes('no shutdown') ||
                  line.includes('ebgp-multihop') ||
                  line.includes('shutdown') ||
                  line.includes('priority percent') ||
                  line.includes('deny ip');
                
                return (
                  <div
                    key={idx}
                    className={
                      isHighlight
                        ? 'text-[#4edea3] font-bold bg-[#00a572]/15 px-1 rounded inline-block'
                        : 'text-[#bcc8cf]'
                    }
                  >
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================= REJECT MODAL ================= */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#171b26] border border-[#ffb4ab]/30 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#3d494e]/30">
              <div className="flex items-center gap-2 text-[#ffb4ab]">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-base text-[#dfe2f1]">
                  Reject AI Diagnosis
                </h3>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-[#869399] hover:text-[#dfe2f1]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#bcc8cf] mb-3 leading-relaxed">
              Please specify the failure category for model fine-tuning and calibration logs:
            </p>

            <div className="flex flex-col gap-2 mb-4">
              <label className="text-[11px] font-mono text-[#869399] uppercase font-bold">
                Failure Reason Category
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value as FailureReason)}
                className="bg-[#0f131d] border border-[#3d494e]/50 rounded-lg p-2.5 text-xs text-[#dfe2f1] focus:outline-none focus:border-[#ffb4ab]"
              >
                <option value="OVER-CORRECTION">OVER-CORRECTION (Disruptive reload or excessive reset)</option>
                <option value="TOPOLOGY DRIFT">TOPOLOGY DRIFT (Wrong port / root bridge assumption)</option>
                <option value="SCOPE MISS">SCOPE MISS (Overly broad ACL / rule collateral damage)</option>
                <option value="HALLUCINATED INTERFACE">HALLUCINATED INTERFACE (Non-existent port/VLAN)</option>
                <option value="SECURITY CONSTRAINT">SECURITY CONSTRAINT (Breaches enterprise policy)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 mb-5">
              <label className="text-[11px] font-mono text-[#869399] uppercase font-bold">
                Human Engineer Correction Note
              </label>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Explain the correct remediation to train responsible AI models..."
                className="bg-[#0f131d] border border-[#3d494e]/50 rounded-lg p-2.5 text-xs text-[#dfe2f1] focus:outline-none focus:border-[#ffb4ab] h-20 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#262a35] text-[#bcc8cf] hover:text-[#dfe2f1]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[#93000a] text-[#ffdad6] hover:bg-[#690005] transition-colors"
              >
                Submit Rejection & Log Failure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
