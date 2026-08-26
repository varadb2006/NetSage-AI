import type { DiagnosticTurn, LabCaseSummary } from '../services/api';
import type { LegacyLabCase } from '../types';

const DEFAULT_COMMANDS = ['show running-config', 'show interfaces', 'show ip route'];

function getMockOutputForCommand(command: string, cliContext: string | undefined, deviceName: string): string {
  const lowerCmd = command.toLowerCase().trim();
  const context = (cliContext ?? '').trim();

  // Extract the command name from the context if it follows "Device# show command -> ..."
  const contextCommandMatch = context.match(/show\s+[\w\-]+(?:\s+[\w\-]+)*/i)?.[0] ?? '';
  
  // If the executed command matches the command containing case evidence, return case context
  if (contextCommandMatch && lowerCmd.includes(contextCommandMatch.toLowerCase())) {
    return context;
  }
  
  // Fallback check if the case context contains keywords matching the quick command
  if (
    (lowerCmd.includes('run') && context.toLowerCase().includes('run')) ||
    (lowerCmd.includes('route') && context.toLowerCase().includes('route')) ||
    (lowerCmd.includes('vlan') && context.toLowerCase().includes('vlan')) ||
    (lowerCmd.includes('int') && context.toLowerCase().includes('int')) ||
    (lowerCmd.includes('policy') && context.toLowerCase().includes('policy'))
  ) {
    return context;
  }

  // Realistic-looking default fallback configurations
  if (lowerCmd.includes('run')) {
    return `Current configuration : 1120 bytes\n!\ninterface GigabitEthernet0/0\n ip address 10.0.1.1 255.255.255.0\n duplex auto\n speed auto\n!\ninterface GigabitEthernet0/1\n no ip address\n shutdown\n!\nrouter ospf 1\n log-adjacency-changes\n!`;
  }
  if (lowerCmd.includes('route')) {
    return `Codes: C - connected, S - static, R - RIP, M - mobile, B - BGP\n       D - EIGRP, O - OSPF, IA - OSPF inter area\n\nGateway of last resort is not set\n\n     10.0.0.0/24 is subnetted, 1 subnets\nC       10.0.1.0 is directly connected, GigabitEthernet0/0`;
  }
  if (lowerCmd.includes('interface')) {
    return `GigabitEthernet0/0 is up, line protocol is up\n  Hardware is Built-in 10/100/1000 Ethernet, address is 0010.7a2b.c301\n  MTU 1500 bytes, BW 1000000 Kbit, DLY 10 usec,\n     reliability 255/255, txload 1/255, rxload 1/255\n     Encapsulation ARPA, loopback not set`;
  }

  return `% Command '${command}' executed on ${deviceName}.\nNo anomalies detected.`;
}

export function toLegacyCase(
  summary: LabCaseSummary,
  sessionId: string,
  diagnosis: DiagnosticTurn | null,
  isSystemOffline: boolean = true
): LegacyLabCase {
  const fixSteps = diagnosis?.fix_steps ?? [];
  const fixScript = fixSteps.join('\n');
  const confidence = diagnosis ? Math.round(diagnosis.confidence * 100) : 0;
  
  // Extract custom show command from case data if present
  const caseSpecificCommand = summary.cli_context
    ? summary.cli_context.match(/show\s+[\w\-]+(?:\s+[\w\-]+)*/i)?.[0]?.trim()
    : null;

  const quickCommandsList = [...DEFAULT_COMMANDS];
  if (caseSpecificCommand && !quickCommandsList.some(c => c.toLowerCase() === caseSpecificCommand.toLowerCase())) {
    quickCommandsList.unshift(caseSpecificCommand); // Put the case-specific command first
  }

  const command = diagnosis?.next_command ?? quickCommandsList[0];

  return {
    id: summary.id,
    title: summary.title,
    device: summary.device,
    symptoms: summary.symptoms,
    sessionId: sessionId || 'starting...',
    targetDevice: summary.device,
    defaultConfidence: diagnosis?.confidence_state ?? 'low',
    terminalInitial: `${summary.device}# `,
    quickCommands: quickCommandsList.map((quickCommand) => ({
      command: quickCommand,
      output: getMockOutputForCommand(quickCommand, summary.cli_context, summary.device),
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
    isRuleOnly: isSystemOffline || diagnosis?.agreement_status === 'rule_only',
  };
}