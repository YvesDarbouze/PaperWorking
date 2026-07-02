# PaperWorking — Agent Dependency Graph

> **Audited**: 2026-05-31 · **Architect**: @architect

This diagram shows which agents depend on which other agents' work. An arrow `A --> B` means "A's work is blocked by or depends on B completing first."

---

## System Dependency Graph

```mermaid
flowchart TD
    subgraph Core["Core Platform"]
        ARCH["@architect - Schema and Types"]
        DATA["@data - Firestore Rules and Indexes"]
        AUTH["@auth - Authentication and MFA"]
        BACKEND["@backend - API Routes and Server Logic"]
    end

    subgraph Financial["Financial Engine"]
        METRICS["@metrics - REI Calculations"]
        QA["@qa - Unit Tests"]
        TAX["@tax - Tax Export"]
    end

    subgraph User_Facing["User-Facing"]
        FRONT["@frontend - React Components"]
        BILLING["@billing - Stripe Integration"]
        DOCS["@docs - Document Pipeline"]
        MARKET["@marketplace - Vendor System"]
        NOTIF["@notifications - Alerts and Push"]
        SUPPORT["@support - Help Center"]
    end

    subgraph Operations["Operations"]
        DEVOPS["@devops - CI/CD and Observability"]
        SECURITY["@security - Compliance and RBAC"]
        GROWTH["@growth - Analytics and Attribution"]
    end

    %% Core dependencies
    DATA --> ARCH
    AUTH --> ARCH
    BACKEND --> ARCH
    BACKEND --> AUTH
    BACKEND --> DATA

    %% Financial dependencies
    METRICS --> ARCH
    QA --> METRICS
    TAX --> METRICS
    TAX --> BACKEND

    %% User-facing dependencies
    FRONT --> ARCH
    FRONT --> BACKEND
    FRONT --> AUTH
    BILLING --> BACKEND
    BILLING --> AUTH
    DOCS --> BACKEND
    DOCS --> DATA
    MARKET --> BACKEND
    MARKET --> DATA
    MARKET --> AUTH
    NOTIF --> BACKEND
    NOTIF --> DATA
    SUPPORT --> FRONT
    SUPPORT --> BACKEND

    %% Operations dependencies
    DEVOPS --> QA
    SECURITY --> AUTH
    SECURITY --> DATA
    SECURITY --> DEVOPS
    GROWTH --> FRONT
    GROWTH --> BACKEND
```

---

## Critical Path Analysis

The critical path for production readiness flows through these agents in order:

```mermaid
flowchart LR
    A["1. @architect"] --> B["2. @data"]
    B --> C["3. @auth"]
    C --> D["4. @backend"]
    D --> E["5. @metrics"]
    E --> F["6. @qa"]
    F --> G["7. @docs"]
    G --> H["8. @frontend"]
    H --> I["9. @devops"]
    I --> J["10. @security"]

    style A fill:#1e3a5f,color:#fff
    style B fill:#1e3a5f,color:#fff
    style C fill:#1e3a5f,color:#fff
    style D fill:#2d5016,color:#fff
    style E fill:#2d5016,color:#fff
    style F fill:#2d5016,color:#fff
    style G fill:#5c3d1e,color:#fff
    style H fill:#5c3d1e,color:#fff
    style I fill:#4a1942,color:#fff
    style J fill:#4a1942,color:#fff
```

---

## Parallelization Opportunities

These agent groups can work independently:

| Group | Agents | Prerequisite |
|-------|--------|--------------|
| Group A | @data, @auth, @metrics | @architect schema stable |
| Group B | @billing, @tax, @notifications | @backend API routes ready |
| Group C | @growth, @support | @frontend components ready |
| Group D | @security, @devops | Can start after @data and @qa |

---

## Data Flow Between Agents

```mermaid
flowchart TD
    subgraph Ingress["Data Ingress"]
        USER_INPUT["User Input"]
        DOC_UPLOAD["Document Upload"]
        STRIPE_WH["Stripe Webhooks"]
    end

    subgraph Processing["Processing Layer"]
        METRICS_ENGINE["Metrics Engine - D1 to D10"]
        OCR_PIPE["OCR Pipeline"]
        WEBHOOK_HANDLER["Webhook Handler"]
    end

    subgraph Storage["Storage Layer"]
        FS["Firestore"]
        FBSTORAGE["Firebase Storage"]
        REDIS["Redis Cache"]
    end

    subgraph Output["Output Layer"]
        DASHBOARD["Dashboard Views"]
        EMAIL["Email via Resend"]
        PDF["PDF Reports"]
        ANALYTICS["PostHog Events"]
    end

    USER_INPUT --> FS
    DOC_UPLOAD --> FBSTORAGE
    DOC_UPLOAD --> OCR_PIPE
    STRIPE_WH --> WEBHOOK_HANDLER
    WEBHOOK_HANDLER --> FS

    FS --> METRICS_ENGINE
    OCR_PIPE --> FS
    METRICS_ENGINE --> FS

    FS --> DASHBOARD
    FS --> EMAIL
    FS --> PDF
    DASHBOARD --> ANALYTICS
    REDIS --> METRICS_ENGINE

    style FBSTORAGE fill:#8b0000,color:#fff
    style OCR_PIPE fill:#8b0000,color:#fff
    style PDF fill:#8b0000,color:#fff
    style ANALYTICS fill:#8b0000,color:#fff
```

> [!NOTE]
> Red nodes indicate components that are currently faked or missing.
