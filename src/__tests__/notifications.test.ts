import { deriveWorkflowNotifications, WORKFLOW_EVENT_TYPES } from "@/lib/notifications/eventStream";
import type { Project } from "@/types/schema";

describe("PROMPT 6 — Workflow Notifications Engine & Preferences", () => {
  const mockProjects: Project[] = [
    {
      id: "p1",
      propertyName: "Gate Test Property",
      address: "100 Main St, Austin, TX",
      currentPhase: 2,
      isClearToClose: false,
      financials: {
        purchasePrice: 500000,
        estimatedARV: 650000,
        costs: [],
        loanAmount: 0, // Gate criteria failing
      },
      phaseGateEvents: [
        {
          id: "evt-1",
          projectId: "p1",
          fromPhase: 1,
          toPhase: 2,
          actorId: "user-1",
          actorRole: "Owner",
          criteriaSnapshot: [],
          overrideReason: "Overriding due diligence requirement for express close.",
          createdAt: new Date("2026-07-20"),
        },
      ],
      preApprovalDocuments: ["/docs/closing_stmt.pdf"],
    } as unknown as Project,
    {
      id: "p2",
      propertyName: "Operations Variance Property",
      address: "200 Elm St, Dallas, TX",
      currentPhase: 3,
      financials: {
        purchasePrice: 400000,
        estimatedARV: 550000,
        costs: [],
        budgetBaseline: { monthlyNoi: 2000 },
        propertyActuals: [
          { period: "2026-05", grossRent: 4000, operatingExpenses: 3000, noi: 1000 }, // -50%
          { period: "2026-06", grossRent: 4000, operatingExpenses: 3200, noi: 800 },  // -60%
        ],
        operationalVarianceAlert: true,
      },
      actionItems: [
        {
          id: "task-1",
          title: "Overdue HVAC Inspection",
          dueDate: new Date("2026-07-15"), // Past due
          completed: false,
        },
      ],
    } as unknown as Project,
    {
      id: "p3",
      propertyName: "1031 Exchange Property",
      address: "300 Pine St, Houston, TX",
      currentPhase: 4,
      financials: {
        purchasePrice: 600000,
        estimatedARV: 800000,
        costs: [],
        soldDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // Sold 35 days ago -> 10 days until 45d ID deadline (<= 14 days)
      },
    } as unknown as Project,
  ];

  test("derives all 6 workflow event types with working deep links", () => {
    const notifications = deriveWorkflowNotifications(mockProjects);
    const generatedTypes = notifications.map((n) => n.type);

    expect(generatedTypes).toContain("gate_criteria_failing");
    expect(generatedTypes).toContain("gate_override_executed");
    expect(generatedTypes).toContain("variance_threshold_tripped");
    expect(generatedTypes).toContain("exchange_1031_deadline");
    expect(generatedTypes).toContain("checklist_item_overdue");
    expect(generatedTypes).toContain("document_upload_completed");

    // Check deep links
    const gateFailNotif = notifications.find((n) => n.type === "gate_criteria_failing");
    expect(gateFailNotif?.deepLinkUrl).toBe("/dashboard/projects/p1?tab=timeline");

    const varianceNotif = notifications.find((n) => n.type === "variance_threshold_tripped");
    expect(varianceNotif?.deepLinkUrl).toBe("/dashboard/projects/p2/operations");

    const exchangeNotif = notifications.find((n) => n.type === "exchange_1031_deadline");
    expect(exchangeNotif?.deepLinkUrl).toBe("/dashboard/projects/p3/phase-4");
  });

  test("preference toggles actively suppress notifications per event type", () => {
    const allSuppressed = deriveWorkflowNotifications(mockProjects, {
      gate_criteria_failing: false,
      gate_override_executed: false,
      variance_threshold_tripped: false,
      exchange_1031_deadline: false,
      checklist_item_overdue: false,
      document_upload_completed: false,
    });

    expect(allSuppressed.length).toBe(0);

    const selectiveSuppressed = deriveWorkflowNotifications(mockProjects, {
      gate_criteria_failing: false,
      variance_threshold_tripped: true,
    });

    expect(selectiveSuppressed.some((n) => n.type === "gate_criteria_failing")).toBe(false);
    expect(selectiveSuppressed.some((n) => n.type === "variance_threshold_tripped")).toBe(true);
  });

  test("all 6 workflow event types are defined in WORKFLOW_EVENT_TYPES catalog", () => {
    expect(WORKFLOW_EVENT_TYPES.length).toBe(6);
    expect(WORKFLOW_EVENT_TYPES).toEqual([
      "gate_criteria_failing",
      "gate_override_executed",
      "variance_threshold_tripped",
      "exchange_1031_deadline",
      "checklist_item_overdue",
      "document_upload_completed",
    ]);
  });
});
