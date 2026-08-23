/**
 * TEMPORARY MOCK DATA FILE
 * -------------------------
 * This file provides stand-in data for Module 1 scaffolding only.
 * It will be DELETED in Module 5 and replaced by live API calls to the FastAPI backend,
 * which reads all case definitions from /data/cases.csv.
 *
 * All field names use snake_case to match the backend API schema and types.ts.
 */

import { FailureLogEntry, ReviewLogEntry, ConfidenceState } from '../types';

export interface LegacyLabCase {
  id: string;
  title: string;
  device: string;
  symptoms: string;
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

export const MOCK_CASES: LegacyLabCase[] = [
  {
    id: 'CAS-9902',
    title: 'DC Core Routing Failure - Gi0/0 Admin Down',
    device: 'Core-Switch-01',
    symptoms: 'Ping to core Gateway IP 192.168.10.1 is failing from client machines. Port status shows admin down.',
    sessionId: 'sess-a101',
    targetDevice: 'Core-Switch-01',
    defaultConfidence: 'high',
    terminalInitial: 'Core-Switch-01# show ip int brief\nInterface              IP-Address      OK? Method Status                Protocol\nGigabitEthernet0/0     192.168.10.1    YES manual administratively down down\n\nCore-Switch-01# ',
    quickCommands: [
      { command: 'show ip int brief', output: 'GigabitEthernet0/0     192.168.10.1    YES manual administratively down down' },
      { command: 'show run int Gi0/0', output: 'interface GigabitEthernet0/0\n ip address 192.168.10.1 255.255.255.0\n shutdown' }
    ],
    nextSuggestedAction: { command: 'no shutdown', rationale: 'Bring up the link to restore VLAN gateway routing.', expectedOutcome: 'Interface status changes to up/up.' },
    aiSuggestedFix: { rootCause: 'Uplink interface GigabitEthernet0/0 is administratively down.', fixScript: 'interface GigabitEthernet0/0\n no shutdown' },
    actualKnownFix: { title: 'Interface Admin Down Resolution', steps: ['Enter interface config mode', 'Issue no shutdown command'], script: 'interface GigabitEthernet0/0\n description Uplink to Core\n no shutdown' },
    defaultHumanOverride: 'interface GigabitEthernet0/0\n no shutdown\n description Uplink to Core',
    finalScript: { ai: ['interface GigabitEthernet0/0', 'no shutdown'], override: ['interface GigabitEthernet0/0', 'no shutdown', 'description Uplink to Core'] },
    osiFault: { layer: 3, name: 'Network', confidence: 95 },
    deterministicAgreement: { status: 'AGREE', rule: 'INTERFACE_ADMIN_DOWN' }
  },
  {
    id: 'CAS-9921',
    title: 'Gateway QoS Buffer Starvation',
    device: 'Gateway-04',
    symptoms: 'VoIP audio clipping. Buffer drops on serial egress interface.',
    sessionId: 'sess-a102',
    targetDevice: 'Gateway-04',
    defaultConfidence: 'low',
    terminalInitial: 'Gateway-04# show policy-map interface\nSerial0/0/0\n  Service-policy output: WAN_EGRESS_POLICY\n    Class-map: VOICE_EF (match-all)\n      0 packets, 0 bytes\n      drop rate 12 packets/sec\n\nGateway-04# ',
    quickCommands: [
      { command: 'show policy-map interface', output: 'Service-policy output: WAN_EGRESS_POLICY\nClass-map: VOICE_EF (match-all)\n drop rate 12 packets/sec' }
    ],
    nextSuggestedAction: { command: 'show running-config policy-map', rationale: 'Check bandwidth reservation configuration.', expectedOutcome: 'Review priority percentage allocations.' },
    aiSuggestedFix: { rootCause: 'Priority bandwidth allocation is set too low for EF traffic.', fixScript: 'policy-map WAN_EGRESS_POLICY\n class VOICE_EF\n  priority percent 30' },
    actualKnownFix: { title: 'QoS Bandwidth Optimization', steps: ['Increase VOICE class priority to 30%'], script: 'policy-map WAN_EGRESS_POLICY\n class VOICE_EF\n  priority percent 30' },
    defaultHumanOverride: 'policy-map WAN_EGRESS_POLICY\n class VOICE_EF\n  priority percent 30',
    finalScript: { ai: ['policy-map WAN_EGRESS_POLICY', 'class VOICE_EF', 'priority percent 30'], override: ['policy-map WAN_EGRESS_POLICY', 'class VOICE_EF', 'priority percent 30'] },
    osiFault: { layer: 4, name: 'Transport', confidence: 60 },
    deterministicAgreement: { status: 'AGREE', rule: 'QOS_MISMATCH' }
  },
  {
    id: 'CAS-9850',
    title: 'VLAN 100 Trunk Encapsulation Missing',
    device: 'Core-Switch-01',
    symptoms: 'Trunk interface GigabitEthernet0/1 to distribution switch is not passing traffic. Syslog reports encapsulation errors.',
    sessionId: 'sess-a103',
    targetDevice: 'Core-Switch-01',
    defaultConfidence: 'high',
    terminalInitial: 'Core-Switch-01# show interfaces trunk\n\nPort        Mode         Encapsulation  Status        Native vlan\nGi0/1       on           negotiate      trunking      1\n\nCore-Switch-01# ',
    quickCommands: [
      { command: 'show interfaces trunk', output: 'Port        Mode         Encapsulation  Status        Native vlan\nGi0/1       on           negotiate      trunking      1' },
      { command: 'show run int Gi0/1', output: 'interface GigabitEthernet0/1\n switchport mode trunk' }
    ],
    nextSuggestedAction: { command: 'switchport trunk encapsulation dot1q', rationale: 'Explicitly configure trunk encapsulation protocol.', expectedOutcome: 'Trunk starts forwarding packets.' },
    aiSuggestedFix: { rootCause: 'Dot1q trunking encapsulation protocol is not configured on older switch IOS branch.', fixScript: 'interface GigabitEthernet0/1\n switchport trunk encapsulation dot1q\n switchport mode trunk' },
    actualKnownFix: { title: 'VLAN Trunk Protocol Fix', steps: ['Enter interface configuration mode', 'Configure encapsulation dot1q'], script: 'interface GigabitEthernet0/1\n switchport trunk encapsulation dot1q\n switchport mode trunk' },
    defaultHumanOverride: 'interface GigabitEthernet0/1\n switchport trunk encapsulation dot1q\n switchport mode trunk',
    finalScript: { ai: ['interface GigabitEthernet0/1', 'switchport trunk encapsulation dot1q', 'switchport mode trunk'], override: ['interface GigabitEthernet0/1', 'switchport trunk encapsulation dot1q', 'switchport mode trunk'] },
    osiFault: { layer: 2, name: 'Data Link', confidence: 98 },
    deterministicAgreement: { status: 'AGREE', rule: 'TRUNK_ENCAPSULATION_MISSING' }
  },
  {
    id: 'CAS-9865',
    title: 'OSPF Hello/Dead Interval Adjacency Deadlock',
    device: 'Branch-Router-02',
    symptoms: 'OSPF neighborship with Core is stuck in INIT or down. Neighbors not visible in peer list.',
    sessionId: 'sess-a104',
    targetDevice: 'Branch-Router-02',
    defaultConfidence: 'high',
    terminalInitial: 'Branch-Router-02# show ip ospf neighbor\n\nBranch-Router-02# show ip ospf interface Gi0/1\nGigabitEthernet0/1 is up, line protocol is up\n  Internet Address 10.0.12.2/24, Area 0\n  Process ID 1, Router ID 2.2.2.2, Network Type BROADCAST, Cost: 1\n  Timer intervals configured, Hello 20, Dead 80, Wait 80, Retransmit 5\n\nBranch-Router-02# ',
    quickCommands: [
      { command: 'show ip ospf neighbor', output: '' },
      { command: 'show ip ospf interface Gi0/1', output: 'GigabitEthernet0/1 is up, line protocol is up\n Timer intervals configured, Hello 20, Dead 80' }
    ],
    nextSuggestedAction: { command: 'ip ospf hello-interval 10', rationale: 'Revert Hello/Dead timers back to standard defaults to negotiate peer states.', expectedOutcome: 'OSPF transitions to FULL adjacency.' },
    aiSuggestedFix: { rootCause: 'OSPF Hello timer set to 20 instead of default 10 on Branch router interface.', fixScript: 'interface GigabitEthernet0/1\n ip ospf hello-interval 10\n ip ospf dead-interval 40' },
    actualKnownFix: { title: 'OSPF Neighbor Timer Match', steps: ['Select interface', 'Set hello-interval to 10', 'Set dead-interval to 40'], script: 'interface GigabitEthernet0/1\n ip ospf hello-interval 10\n ip ospf dead-interval 40' },
    defaultHumanOverride: 'interface GigabitEthernet0/1\n ip ospf hello-interval 10\n ip ospf dead-interval 40',
    finalScript: { ai: ['interface GigabitEthernet0/1', 'ip ospf hello-interval 10', 'ip ospf dead-interval 40'], override: ['interface GigabitEthernet0/1', 'ip ospf hello-interval 10', 'ip ospf dead-interval 40'] },
    osiFault: { layer: 3, name: 'Network', confidence: 92 },
    deterministicAgreement: { status: 'AGREE', rule: 'OSPF_TIMER_MISMATCH' }
  },
  {
    id: 'CAS-9890',
    title: 'BGP Community Egress Route Tagging Filtering',
    device: 'Edge-Router-01',
    symptoms: 'ISP peer rejects outbound path advertisement update. Community routing policy mismatch.',
    sessionId: 'sess-a105',
    targetDevice: 'Edge-Router-01',
    defaultConfidence: 'low',
    terminalInitial: 'Edge-Router-01# show ip bgp neighbors 203.0.113.1 advertised-routes\n\nEdge-Router-01# ',
    quickCommands: [
      { command: 'show ip bgp neighbors 203.0.113.1 advertised-routes', output: 'Zero paths advertised to neighbor 203.0.113.1.' }
    ],
    nextSuggestedAction: { command: 'show route-map COMMUNITY_TAG', rationale: 'Verify if communities are stripped from local ASN egress routes map.', expectedOutcome: 'Identify missing send-community attribute config.' },
    aiSuggestedFix: { rootCause: 'Egress route-map is stripping path metrics instead of appending transit tags.', fixScript: 'router bgp 65001\n neighbor 203.0.113.1 send-community both' },
    actualKnownFix: { title: 'BGP Community Propagation configuration', steps: ['Add send-community parameter to BGP neighbor process'], script: 'router bgp 65001\n neighbor 203.0.113.1 send-community both' },
    defaultHumanOverride: 'router bgp 65001\n neighbor 203.0.113.1 send-community both',
    finalScript: { ai: ['router bgp 65001', 'neighbor 203.0.113.1 send-community both'], override: ['router bgp 65001', 'neighbor 203.0.113.1 send-community both'] },
    osiFault: { layer: 3, name: 'Network', confidence: 70 },
    deterministicAgreement: { status: 'AGREE', rule: 'BGP_COMMUNITY_MISSING' }
  }
];


export const INITIAL_FAILURE_LOGS: FailureLogEntry[] = [
  {
    id: 'fl-1',
    case_id: '#CAS-9921',
    case_title: 'Gateway 04 Packet Loss & Jitter',
    initial_ai_output: 'Suggest hard reset on Gateway 04 due to packet loss and buffer congestion...',
    human_correction: 'Adjusted QoS queuing priorities; hardware functioning normally without reload.',
    failure_reason: 'OVER-CORRECTION',
    timestamp: '10:42:01 UTC',
    device: 'Gateway-04',
    engineer: 'Alex Rivera (Staff NetOps)'
  },
  {
    id: 'fl-2',
    case_id: '#CAS-9918',
    case_title: 'Spanning Tree RSTP Topology Shift',
    initial_ai_output: 'Identified loop in spanning tree. Block port Gi0/12 immediately.',
    human_correction: 'Confirmed topology change; blocked Gi0/14 instead based on downstream bridge ID.',
    failure_reason: 'TOPOLOGY DRIFT',
    timestamp: '09:15:22 UTC',
    device: 'Dist-Switch-02',
    engineer: 'Devon Vance (Principal Architect)'
  },
  {
    id: 'fl-3',
    case_id: '#CAS-9890',
    case_title: 'Lateral Movement Containment',
    initial_ai_output: 'Apply ACL rule deny ip any any to mitigate lateral movement on core ingress.',
    human_correction: 'Applied specific subnet block (10.0.5.0/24). Full deny would break prod ERP.',
    failure_reason: 'SCOPE MISS',
    timestamp: '08:05:44 UTC',
    device: 'Sec-Gateway-04',
    engineer: 'Sarah Chen (Lead SecOps)'
  },
  {
    id: 'fl-4',
    case_id: '#CAS-9865',
    case_title: 'OSPF Adjacency Deadlock',
    initial_ai_output: 'Recommended rebuilding area 0 on non-existent loopback int Loopback99.',
    human_correction: 'Configured ip ospf mtu-ignore on Gi0/2 physical link; corrected MTU discrepancy.',
    failure_reason: 'HALLUCINATED INTERFACE',
    timestamp: '07:22:15 UTC',
    device: 'Core-Switch-01',
    engineer: 'Marcus Brody (Senior NetEng)'
  },
  {
    id: 'fl-5',
    case_id: '#CAS-9812',
    case_title: 'BGP Community Tag Filtering',
    initial_ai_output: 'Suggested removing BGP neighbor 203.0.113.1 from routing process completely.',
    human_correction: 'Filtered route-map COMMUNITY_TAG to strip transit AS 65000 path attributes.',
    failure_reason: 'OVER-CORRECTION',
    timestamp: '05:40:11 UTC',
    device: 'Edge-Router-01',
    engineer: 'Alex Rivera (Staff NetOps)'
  }
];

export const INITIAL_REVIEW_LOGS: ReviewLogEntry[] = [
  {
    id: 'rev-101',
    case_id: 'CAS-9902',
    title: 'DC Core Routing Failure - Gi0/0 Admin Down',
    device: 'Core-Switch-01',
    outcome: 'ACCEPTED',
    ai_suggested_fix: 'interface GigabitEthernet0/0\n no shutdown',
    final_fix_applied: 'interface GigabitEthernet0/0\n description Uplink to Core\n no shutdown',
    human_rationale: 'Added documentation description to interface configuration before deployment.',
    engineer: 'Alex Rivera',
    timestamp: '11:15:30 UTC',
    time_to_resolve: '1.4 min'
  },
  {
    id: 'rev-102',
    case_id: 'CAS-9921',
    title: 'Gateway QoS Buffer Starvation',
    device: 'Gateway-04',
    outcome: 'OVERRIDDEN',
    ai_suggested_fix: 'reload in 1',
    final_fix_applied: 'policy-map WAN_EGRESS_POLICY\n class VOICE_EF\n  priority percent 30',
    human_rationale: 'Avoided disruptive reboot; dynamically reallocated QoS priority bandwidth.',
    engineer: 'Alex Rivera',
    timestamp: '10:42:01 UTC',
    time_to_resolve: '3.2 min'
  },
  {
    id: 'rev-103',
    case_id: 'CAS-9918',
    title: 'Spanning Tree Topology Loop',
    device: 'Dist-Switch-02',
    outcome: 'OVERRIDDEN',
    ai_suggested_fix: 'interface Gi0/12\n shutdown',
    final_fix_applied: 'interface Gi0/14\n shutdown',
    human_rationale: 'Gi0/12 is primary uplink to Core. Blocked rogue downlink Gi0/14 instead.',
    engineer: 'Devon Vance',
    timestamp: '09:15:22 UTC',
    time_to_resolve: '2.8 min'
  },
  {
    id: 'rev-104',
    case_id: 'CAS-9890',
    title: 'Lateral Movement Containment',
    device: 'Sec-Gateway-04',
    outcome: 'OVERRIDDEN',
    ai_suggested_fix: 'ip access-list extended SEC_FILTER_IN\n 1 deny ip any any',
    final_fix_applied: 'ip access-list extended SEC_FILTER_IN\n 5 deny ip 10.0.5.0 0.0.0.255 10.0.20.0 0.0.0.255 log',
    human_rationale: 'Narrowed scope to isolate infected staging subnet without impacting production database users.',
    engineer: 'Sarah Chen',
    timestamp: '08:05:44 UTC',
    time_to_resolve: '2.1 min'
  },
  {
    id: 'rev-105',
    case_id: 'CAS-9850',
    title: 'VLAN 100 Trunk Encapsulation Missing',
    device: 'Core-Switch-01',
    outcome: 'ACCEPTED',
    ai_suggested_fix: 'interface Gi0/1\n switchport trunk encapsulation dot1q\n switchport mode trunk',
    final_fix_applied: 'interface Gi0/1\n switchport trunk encapsulation dot1q\n switchport mode trunk',
    human_rationale: 'Exact match with Cisco best practice for 3850 Catalyst switches.',
    engineer: 'Marcus Brody',
    timestamp: '06:12:08 UTC',
    time_to_resolve: '0.9 min'
  }
];

// Dashboard chart data — will be served by /dashboard/metrics in Module 5
export const KPI_METRICS = {
  totalCasesAnalyzed: '14,892',
  totalCasesGrowth: '+12% wk',
  agreementRate: '96.4%',
  agreementSparkline: [
    { x: 0, y: 92.1 }, { x: 1, y: 93.4 }, { x: 2, y: 94.0 },
    { x: 3, y: 94.8 }, { x: 4, y: 95.5 }, { x: 5, y: 95.9 }, { x: 6, y: 96.4 }
  ],
  avgTurns: '2.1',
  avgTurnsChange: '-0.4 turns',
  totalOverrides: '536'
};

export const ISSUE_DISTRIBUTION_DATA = [
  { name: 'VLAN & Layer 2', value: 35, color: '#68d6ff' },
  { name: 'Routing & BGP/OSPF', value: 25, color: '#00a572' },
  { name: 'Physical & Interface Down', value: 20, color: '#ffbc69' },
  { name: 'Security & ACL Scope', value: 20, color: '#3d494e' }
];

export const CALIBRATION_CURVE_DATA = [
  { confidence: 0, modelAccuracy: 2, ideal: 0 },
  { confidence: 10, modelAccuracy: 8, ideal: 10 },
  { confidence: 20, modelAccuracy: 18, ideal: 20 },
  { confidence: 30, modelAccuracy: 26, ideal: 30 },
  { confidence: 40, modelAccuracy: 35, ideal: 40 },
  { confidence: 50, modelAccuracy: 48, ideal: 50 },
  { confidence: 60, modelAccuracy: 64, ideal: 60 },
  { confidence: 70, modelAccuracy: 78, ideal: 70 },
  { confidence: 80, modelAccuracy: 89, ideal: 80 },
  { confidence: 90, modelAccuracy: 95, ideal: 90 },
  { confidence: 100, modelAccuracy: 99, ideal: 100 }
];

export const AGREEMENT_PROGRESS_DATA = [
  { label: 'Heuristic Match', percentage: 88, colorClass: 'bg-[#68d6ff]' },
  { label: 'LLM Confidence', percentage: 92, colorClass: 'bg-[#00a572]' },
  { label: 'Total Consensus', percentage: 84, colorClass: 'bg-[#f19b03]' }
];
