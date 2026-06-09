# Mocked, Simulated, and Hardcoded Features Audit Report

This report outlines all identified mock data, hardcoded components, simulated workflows, and placeholder features within the **PaperWorking** application. It serves as a comprehensive developer checklist to replace stubs and fallback mechanisms with production-ready integrations.

---

## 1. Summary Audit Table

| Subsystem / Feature | Location / File Link | Verdict | Description | Action Required / Production Integration |
| :--- | :--- | :---: | :--- | :--- |
| **Address Autocomplete** | [address.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/providers/address.ts#L33-72) | `MOCK` | Queries a static list of 20 seeded US properties with a simulated `250ms` delay. | Wire to Google Places Autocomplete API or Mapbox Geocoding API. |
| **Property Data & Comps** | [property.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/providers/property.ts#L75-296) | `MOCK` | Fallbacks to mock provider (deterministic values from address hash, 400-600ms latency) if API keys are missing. | Configure API keys for RentCast, ATTOM, or Mashvisor in `.env.local` and implement the fetch calls. |
| **Document AI & OCR** | [documentAIProcessor.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/ocr/documentAIProcessor.ts#L32-391) | `MOCK` | Simulates `200-600ms` processing delay and returns pre-configured mocked values for CDs, Leases, Appraisals, etc. | Install `@google-cloud/documentai`, set up processors on Google Cloud, and map extracted entities. |
| **E-Signature Requests** | [ESignAction.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/shared/ESignAction.tsx#L15-25) | `MOCK` | Simulates DocuSign envelope request and signature completion with a hardcoded `2000ms` timeout. | Integrate DocuSign or HelloSign API. Call signing URL generation APIs on the backend. |
| **Title Verification & Registry** | [titleVerify.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/web3/titleVerify.ts#L6-22) & [web3RegistryHooks.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/web3RegistryHooks.ts#L10-24) | `MOCK` | Simulates smart contract block mining (1.5s and 2.5s) returning random hex transaction hashes. | Connect to an EVM-compatible chain using `ethers` or `viem`, reading from a deployed title deed smart contract. |
| **Connected Services & Prefs** | [general/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/settings/general/page.tsx#L90-123) | `MOCK` | Simulates Google Drive / MLS toggle connections (1.2s timeout), preferences save (600ms delay), and blocks account delete. | Implement Google OAuth2 flow, RESO/MLS connection endpoint, and a secure server action for account deletion. |
| **Data Room PDF Export** | [data-room/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/data-room/page.tsx#L979-983) | `BROKEN` | The PDF generation button shows a standard browser `alert()` placeholder. | Build a PDF rendering endpoint on `/api/reports/pdf` using `pdfkit`, `react-pdf`, or Puppeteer. |
| **Closing Checklist Uploads** | [ClosingChecklist.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/closing/ClosingChecklist.tsx#L105-116) | `MOCK` | Instantly maps checklists to static paths `/docs/closing-${id}.pdf` without executing file upload or writes. | Connect to Firebase Storage (`firebase/storage`), upload files to a `closes/` bucket, and save URLs in Firestore. |
| **Photography Uploads** | [PhotographyUploadManager.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/exit/PhotographyUploadManager.tsx#L43-46) | `MOCK` | Simulates uploading asset files to MLS, instantly toggling `uploaded: true` and listing static Unsplash placeholders. | Connect file uploader to Firebase Storage or S3. Integrate with listing syndication APIs (e.g. ListHub or Spark). |
| **Live Support Chat** | [SupportWidget.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/support/SupportWidget.tsx#L88-129) | `MOCK` | Simulates active agent typing (1s-1.5s delay) and answers based on simple keyword matches. Mocks ticket creation. | Embed a real chat widget script (HubSpot, Intercom, Crisp) or connect a custom RAG-backed chatbot API route. |
| **Transactional Emailing** | [CommunicationEngine.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/engine/CommunicationEngine.ts#L211-237) | `MOCK` | Logs email body to console and returns fake message IDs if `RESEND_API_KEY` is not configured in the environment. | Register a verified domain on Resend, generate a production key, and set `RESEND_API_KEY` in environment variables. |
| **Municipal Permit Sync** | [permitTrackerApi.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/permitTrackerApi.ts#L8-34) | `MOCK` | Automatically moves pending permits to `Approved` if filed date is > 3 days old or in testing environments. | Integrate building permit database feeds (e.g., PermitKeeper or OpenCounter) or scrape local municipality tables. |

---

## 2. Detailed Technical Breakdown & Integration Guides

### 2.1. Address Autocomplete
*   **Current State**: `MockAddressProvider` queries a static list of 20 US properties. Prefix matching filters suggestions with a `setTimeout` of `250ms` to fake network latency.
*   **Production Integration Steps**:
    1.  Get an API Key from Google Cloud Console with Google Places API enabled.
    2.  Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`.
    3.  Install Google Maps Services client or use browser fetch:
        ```bash
        npm install @googlemaps/google-maps-services-js
        ```
    4.  Update `src/lib/providers/address.ts` to execute a fetch request to `https://maps.googleapis.com/maps/api/place/autocomplete/json`. Map the google places results to `AddressSuggestion` objects.

### 2.2. Property Data & Comps
*   **Current State**: Fallbacks to `MockPropertyDataProvider` when env keys like `RENTCAST_API_KEY`, `ATTOM_API_KEY`, or `MASHVISOR_API_KEY` are missing. The mock generates deterministic results based on a seeded hash of the address string, with a `400ms` to `600ms` delay.
*   **Production Integration Steps**:
    1.  Acquire API credentials from RentCast, ATTOM, or Mashvisor.
    2.  Set `PROPERTY_DATA_PROVIDER=rentcast` (or `attom`/`mashvisor`) along with `RENTCAST_API_KEY` in your production environments.
    3.  In `src/lib/providers/property.ts`, replace the placeholder implementations inside `RentCastPropertyProvider`, `AttomPropertyProvider`, and `MashvisorPropertyProvider` with actual HTTP `fetch` requests targeting their respective REST endpoints (e.g., `https://api.rentcast.io/v1/properties/AVM`). Map the returned API schema to `PropertyFacts` and `Comp[]`.

### 2.3. Google Document AI & OCR
*   **Current State**: `processDocument` waits `200-600ms` and loads static fields using the `getStubFields(documentType)` helper for Closing Disclosures, Receipts, Leases, Inspections, Appraisals, Contractor Bids, and Title Reports.
*   **Production Integration Steps**:
    1.  Install the official Google Cloud Document AI client SDK:
        ```bash
        npm install @google-cloud/documentai
        ```
    2.  Create a Document AI processor in the Google Cloud Console (e.g. Form Parser or Custom Document Splitter/Classifier).
    3.  Add `GOOGLE_DOCUMENT_AI_PROCESSOR_ID` and `GOOGLE_CLOUD_PROJECT` to your environment variables. Ensure the runtime environment (Cloud Run, Vercel, or App Hosting) has Google Application Credentials configured.
    4.  Replace `getStubFields` in `src/lib/ocr/documentAIProcessor.ts` with code that initializes `DocumentProcessorServiceClient`, extracts text blocks/entities, and maps them to confidence scores.

### 2.4. E-Signature Requests
*   **Current State**: Simulates signature notification and completion after a static `2000ms` timeout.
*   **Production Integration Steps**:
    1.  Install the DocuSign eSignature SDK:
        ```bash
        npm install @docusign/esignature
        ```
    2.  Configure DocuSign API credentials: Integration Key (Client ID), Secret Key, User ID, and API Account ID.
    3.  Build a backend route `/api/esign/create-envelope` that constructs an envelope with the document, maps signature tabs, and generates a recipient signing URL.
    4.  In `ESignAction.tsx`, fetch that signing URL and open it either in a new tab or in a modal iframe. Hook up the DocuSign Connect webhook to update the document signature state in Firestore once signed.

### 2.5. Title Verification & Registry
*   **Current State**: Simulated network mining delay (1.5s–2.5s) returning random transaction hashes using `crypto.getRandomValues`.
*   **Production Integration Steps**:
    1.  Install `ethers` or `viem`:
        ```bash
        npm install viem
        ```
    2.  Deploy a property deed / title registry smart contract to a secure blockchain (e.g., Base or Polygon).
    3.  Write client code in `src/lib/web3/titleVerify.ts` to connect to a JSON-RPC provider, call the registry smart contract's read functions (e.g., `verifyTitleDeed(address)`), and display real transaction receipts.

### 2.6. Connected Services (Settings)
*   **Current State**: Toggling services like Google Drive or MLS is simulated via a `1200ms` timeout updating state, preferences saves run a `600ms` timeout, and account delete displays a demo toast.
*   **Production Integration Steps**:
    1.  **Google Drive**: Implement OAuth2 client flow using Google APIs (`googleapis`), request the `https://www.googleapis.com/auth/drive.file` scope, and store the user's refresh token in Firestore under `/users/{uid}/tokens`.
    2.  **MLS integration**: Implement a REST API connection to a RESO Web API server (such as Bridge Interactive MLS feed).
    3.  **Delete Account**: Implement a server action `/api/users/delete` that deletes the user's Firebase Auth account, removes corresponding records in Firestore (`/users/{uid}`) and deletes records from the database using Prisma.

### 2.7. Data Room PDF Export
*   **Current State**: The export button runs browser `alert("PDF report generation will be available in the next release.")`.
*   **Production Integration Steps**:
    1.  Install a PDF generation library suitable for Node server-side generation (e.g. `@react-pdf/renderer` or `pdfkit`) or set up a cloud function running Puppeteer:
        ```bash
        npm install @react-pdf/renderer
        ```
    2.  Create an API route `/api/reports/pdf` that fetches the data room's current state and layout.
    3.  Generate the PDF stream and return it with headers `Content-Type: application/pdf` and `Content-Disposition: attachment; filename=dataroom-report.pdf`. Change the button to download this stream.

### 2.8. Closing Checklist Uploads
*   **Current State**: Immediately marks checklists with a fake path `/docs/closing-${id}.pdf` without processing files.
*   **Production Integration Steps**:
    1.  Add a real HTML `<input type="file" />` control in `src/components/closing/ClosingChecklist.tsx`.
    2.  Use Firebase Storage client SDK to upload the file to `projects/${projectId}/closing/${itemId}.pdf`:
        ```typescript
        import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
        import { storage } from '@/lib/firebase/config';
        
        const fileRef = ref(storage, `projects/${projectId}/closing/${id}.pdf`);
        await uploadBytes(fileRef, selectedFile);
        const downloadUrl = await getDownloadURL(fileRef);
        ```
    3.  Update the project's checklist item in Firestore with the real `downloadUrl`.

### 2.9. Photography & MLS Syndication Uploads
*   **Current State**: Instantly marks files as uploaded with Unsplash photo placeholders.
*   **Production Integration Steps**:
    1.  Implement a dropzone uploader in `PhotographyUploadManager.tsx` that uploads images to S3 or Firebase Storage.
    2.  Connect to a listing syndication service API (e.g., ListHub API, MLS RETS API, or Spark API).
    3.  Queue listing media sync jobs to automatically distribute high-res photos to MLS boards once uploaded.

### 2.10. Live Support Chat Widget
*   **Current State**: typing simulator response triggered after `1000ms-1500ms` with keyword matching on `noi`, `cash flow`, and `billing`.
*   **Production Integration Steps**:
    1.  Replace the custom UI widget with a production live chat script (e.g., Intercom, HubSpot, or Zendesk chat widget) injected in `src/app/layout.tsx`.
    2.  Alternatively, connect the existing chat interface to an AI assistant route (`/api/support/chat`) that uses a vector DB (Pinecone/Chroma) loaded with PaperWorking's help center docs, invoking Gemini or GPT-4 to handle queries.

### 2.11. Transactional Emailing (Resend API)
*   **Current State**: Checks `process.env.RESEND_API_KEY`. If not set, it intercepts the call, dumps the subject/body details to the Node terminal logs, and returns a fake `mock_{timestamp}_{random}` message ID.
*   **Production Integration Steps**:
    1.  Register a verified email sending domain at Resend.
    2.  Generate a production API key.
    3.  Configure `RESEND_API_KEY` in the production environment variables (e.g., Vercel / App Hosting dashboard). The system will automatically switch from logging stubs to delivering real emails.

### 2.12. Municipal Permit Sync
*   **Current State**: Pending permits are moved to `Approved` if they are older than 3 days, or automatically in a `'test'` node environment.
*   **Production Integration Steps**:
    1.  Integrate with municipal permit APIs or commercial building permit databases (such as Building Permit APIs or PermitKeeper).
    2.  Alternatively, configure a cron task or webhook that polls local county public records databases, updates permit details in the database, and notifies the client once they match.
