import type { DiagnosticTurn, LabCaseSummary } from '../services/api';
import type { LegacyLabCase } from './mockCases';

const DEFAULT_COMMANDS = ['show running-config', 'show interfaces', 'show ip route'];

export function toLegacyCase(
  summary: LabCaseSummary,
  sessionId: string,
  diagnosis: DiagnosticTurn | null
): LegacyLabCase {
  const fixSteps = diagnosis?.fix_steps ?? [];
  const fixScript = fixSteps.join('\n');
  const confidence = diagnosis ? Math.round(diagnosis.confidence * 100) : 0;
  const command = diagnosis?.next_command ?? DEFAULT_COMMANDS[0];

  return {
    id: summary.id,
    title: summary.title,
    device: summary.device,
    symptoms: summary.symptoms,
    sessionId: sessionId || 'starting...',
    targetDevice: summary.device,
    defaultConfidence: diagnosis?.confidence_state ?? 'low',
    terminalInitial: `${summary.device}# ${summary.cli_context ?? ''}\n\n${summary.device}# `,
    quickCommands: DEFAULT_COMMANDS.map((quickCommand) => ({
      command: quickCommand,
      output: summary.cli_context ?? 'No captured CLI output for this case.',
    })),
    nextSuggestedAction: {
      command,
      rationale: diagnosis?.evidence_against?.[0] ?? 'Submit CLI output to increase diagnostic confidence.',
      expectedOutcome: diagnosis?.confidence_state === 'high' ? 'Validate the proposed Cisco IOS fix.' : 'Collect evidence for the next diagnostic turn.',
    },
    aiSuggestedFix: {
      rootCause: diagnosis?.root_cause ?? 'Run the diagnostic engine to generate a case-specific finding.',
      fixScript,
    },
    actualKnownFix: {
      title: 'Case reference resolution',
      steps: fixSteps,
      script: fixScript || 'The reference fix becomes available after CLI evidence is submitted.',
    },
    defaultHumanOverride: fixScript,
    finalScript: { ai: fixSteps, override: fixSteps },
    osiFault: {
      layer: diagnosis?.osi_layer ?? 3,
      name: diagnosis?.osi_layer_name ?? 'Pending diagnosis',
      confidence,
    },
    deterministicAgreement: {
      status: diagnosis?.agreement_status === 'agree' ? 'AGREE' : 'PENDING',
      rule: diagnosis?.rule_flags[0]?.flag ?? 'RUN_DIAGNOSTIC_ENGINE',
    },
  };
}