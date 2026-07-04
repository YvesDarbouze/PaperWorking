# Mock-Hunter: Unimplemented & Simulated Features Report

This report catalogs all features in the **PaperWorking** application that currently operate as **pure stubs or simulations** with **0% production backend/external integration**. These features are decorative or run client-side timers/alert stubs and are not yet developed to the point of executing real-world functionality.

---

## 1. Unimplemented Features Index

The following features have no underlying database persistence, API client integration, or external service connections:

| Feature / Subsystem | Location / File Link | Verdict | Mock Behavior | Integration Requirements |
| :--- | :--- | :---: | :--- | :--- |
| **E-Signature Requests** | [ESignAction.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/shared/ESignAction.tsx#L15-25) | `MOCK` | Shows a loading toast and resolves after a hardcoded `2000ms` `setTimeout` without calling any signing provider. | Integrate DocuSign or HelloSign API; handle OAuth / token authentication and envelope callbacks. |
| **Document AI & OCR** | [documentAIProcessor.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/ocr/documentAIProcessor.ts#L32-391) | `MOCK` | Simulates an async processing delay of `200-600ms` and returns a static list of parsed fields. | Install `@google-cloud/documentai`, set up processors in GCP console, and parse Document AI JSON entities. |
| **Connected Services (Google Drive & MLS)** | [general/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/settings/general/page.tsx#L103-114) | `MOCK` | Simulates Google Drive / MLS connection toggles with a `1200ms` `setTimeout` to update local UI state. | Implement Google OAuth2 scopes flow and RESO Web API endpoints to establish live credentials sync. |
| **Data Room PDF Export** | [data-room/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/data-room/page.tsx#L979-983) | `BROKEN` | Clicking the PDF export button displays a standard browser `alert` placeholder popup. | Set up a PDF engine (e.g. `@react-pdf/renderer` or Puppeteer) on `/api/reports/pdf` to stream formatted files. |
| **Closing Checklist File Uploads** | [ClosingChecklist.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/closing/ClosingChecklist.tsx#L105-116) | `MOCK` | Instantly maps documents to a static `/docs/closing-${id}.pdf` path without receiving or saving a file binary. | Integrate a file input connected to a Firebase Storage upload ref, saving the real URL back to Firestore. |
| **Photography & MLS Syndication** | [PhotographyUploadManager.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/exit/PhotographyUploadManager.tsx#L43-46) | `MOCK` | Instantly toggles uploads to `uploaded: true` and displays Unsplash placeholder images. | Integrate a dropzone to upload assets to Cloud Storage/S3 and dispatch them via listing syndication feeds (e.g. ListHub). |
| **Live Support Chat** | [SupportWidget.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/support/SupportWidget.tsx#L88-129) | `MOCK` | Simulates agent typing and responds with hardcoded answers based on basic input keyword checks (`noi`, `cash flow`). | Inject live chat scripts (e.g. Intercom or Crisp) or route inputs to an LLM support assistant endpoint. |
| **PostHog Event Tracking** | [events/route.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/events/route.ts#L69-74) | `MOCK` | Logs event payloads to the console via `console.log('[PostHog Stub]', ...)` instead of transmitting them. | Install and configure the official PostHog Node SDK (`posthog-node`) to dispatch analytical events. |
| **Billing Team Seat Management** | [billing/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/settings/billing/page.tsx#L101-105) | `BROKEN` | The "Manage Team" action contains no event handlers or links and acts as a static label. | Link button click to the workspace settings roster page `/dashboard/team` or open a user seat modification drawer. |
| **Invoice History Downloader** | [billing/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/settings/billing/page.tsx#L113-117) | `BROKEN` | The "Download All" invoice history button is decorative and contains no event handler. | Route the button click to fetch historical invoice listings from Stripe API and download the files. |
| **Sourcing Manual Lead Intake** | [sourcing/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/sourcing/page.tsx#L125-128) | `BROKEN` | The "Add Manual Lead" button is a visual placeholder that does not open any form. | Create a drawer/modal in the Sourcing tab that captures manual property values and saves them to Firestore. |
| **Vendor Task Assignment** | [team.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/actions/team.ts#L574-590) | `MOCK` | Logs assignment state in the console and queues email notifications, but does not update task assignment rows in Firestore. | Write the assigned vendor relation to the task document object under `/projects/{projectId}/tasks`. |

---

## 2. Technical Code Audits

### E-Signature Requests
*   **Source File**: [ESignAction.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/shared/ESignAction.tsx#L15-25)
*   **Unimplemented Code Block**:
    ```typescript
    const handleSigning = async () => {
      setIsSigning(true);
      toast.loading(`Sending signature request to ${signeeRole}...`, { id: 'esign' });
      
      // Simulate external API call
      setTimeout(() => {
        toast.success(`${documentName} signed successfully!`, { id: 'esign' });
        setIsSigning(false);
        onSigned();
      }, 2000);
    };
    ```

### Document AI & OCR
*   **Source File**: [documentAIProcessor.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/ocr/documentAIProcessor.ts#L44-67)
*   **Unimplemented Code Block**:
    ```typescript
    export async function processDocument(
      _storagePath: string,
      documentType: OcrDocumentType,
      _mimeType: string = 'application/pdf'
    ): Promise<OcrProcessingResult> {
      const startTime = Date.now();
      // Simulate async processing delay (200–600ms)
      await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 400));
      try {
        const extractedFields = getStubFields(documentType);
        ...
    ```

### Connected Services
*   **Source File**: [general/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/settings/general/page.tsx#L103-114)
*   **Unimplemented Code Block**:
    ```typescript
    const handleConnect = async (serviceId: string) => {
      setConnectingId(serviceId);
      // Simulate OAuth/connection flow
      await new Promise((r) => setTimeout(r, 1200));
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, connected: true } : s))
      );
      setConnectingId(null);
      ...
    ```

### PostHog Analytics
*   **Source File**: [events/route.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/events/route.ts#L69-74)
*   **Unimplemented Code Block**:
    ```typescript
    // ── PostHog stub (swap for real SDK later) ──
    console.log('[PostHog Stub]', {
      distinctId: uid,
      event,
      properties: { ...properties, $timestamp: timestamp || new Date().toISOString() },
    });
    ```
