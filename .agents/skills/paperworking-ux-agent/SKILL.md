---
name: paperworking-ux-agent
description: "UX/UI Agent to ensure PaperWorking dashboard adherence to 7 core SaaS UX patterns."
risk: safe
---

# PaperWorking UX/UI Agent

## Overview

This skill instantiates the **PaperWorking UX/UI Agent**. Its primary responsibility is to actuate and review the PaperWorking dashboard to ensure it transitions from mocked features to a production-ready, exceptional SaaS application. 

The agent enforces seven core UX patterns based on modern SaaS principles.

## When to Use This Skill

Invoke this skill whenever you are:
1. Replacing mocked features with live data in the PaperWorking dashboard.
2. Designing or refining new UI components for the dashboard.
3. Conducting UX/UI audits of the platform.
4. Implementing user flows, onboarding, or data visualizations.

## Core UX Principles (The 7 Pillars)

Whenever building or reviewing PaperWorking features, you MUST evaluate and implement them against these 7 patterns:

### 1. Progressive Onboarding
- **Goal:** Educate and engage.
- **Actionable Steps:** 
  - Do not overwhelm users. Introduce features step-by-step as they use the app.
  - Implement tooltips, non-intrusive modals, or guided tours highlighting key actions in context.
  - Ensure onboarding is skippable and revisitable.
  - *Example:* Highlight key actions when they navigate to a new dashboard section.

### 2. Contextual Help and In-App Support
- **Goal:** Provide real-time assistance where needed.
- **Actionable Steps:**
  - Add contextual tooltips explaining complex data points or features.
  - Anticipate user needs (e.g., "Need a quick guide on setting up this property?").
  - Do not force users to leave the app to search a help center for basic tasks.

### 3. Streamlined Task Flows with Smart Defaults
- **Goal:** Boost efficiency and simplify complex workflows.
- **Actionable Steps:**
  - Pre-configure settings and automate repetitive tasks.
  - Minimize form fields by pre-filling data where possible (e.g., auto-populating property details).
  - Provide sensible "smart defaults" that users can easily override.

### 4. Interactive Dashboards for Data-Driven Insights
- **Goal:** Turn raw data into actionable insights to keep users engaged.
- **Actionable Steps:**
  - Build customizable dashboards (allow filtering, layout adjustments).
  - Include interactive elements: hover states, drill-down charts, and real-time updates.
  - Use high-quality visualizations (sparklines, charts) to make complex real estate metrics easily digestible.

### 5. Micro-Interactions for Delight and Feedback
- **Goal:** Make interactions feel polished, responsive, and delightful.
- **Actionable Steps:**
  - Include subtle animations/feedback for button clicks, form submissions, and loading states.
  - Use hover effects on buttons and cards to indicate interactivity.
  - Keep animations short (under 300ms).

### 6. Mobile-First and Responsive Design
- **Goal:** Deliver a seamless mobile experience.
- **Actionable Steps:**
  - Design for mobile screens first.
  - Prioritize touch-friendly elements (larger touch targets, swipe gestures).
  - Ensure the dashboard layout scales gracefully to desktop without losing functionality.

### 7. Role-Based Personalization
- **Goal:** Tailor experiences to user roles and goals.
- **Actionable Steps:**
  - Customize UI features based on user roles (e.g., Admin vs. Operator vs. Investor).
  - Offer specialized templates or views tailored to the user's specific real estate niche.

## Best Practices for Actuation

When moving from mocked features to live features, always:
- **Consistency:** Use the unified "Antigravity" design system (consistent colors, typography, and button styles).
- **Feedback Loops:** Always acknowledge user actions with visual/auditory feedback (e.g., success toasts after saving a project).
- **Performance:** Optimize for load times under 2 seconds. Reduce latency in interactions.
- **Accessibility:** Ensure high contrast (e.g., replacing `#595959` with `#1A1A1A`), readable fonts, and keyboard-navigable interfaces.

## Agent Instructions

When asked to "actuate" a mocked feature:
1. **Analyze** the current mocked component.
2. **Review** against the 7 UX pillars above. Which pillars apply to this component?
3. **Plan** the implementation, explicitly calling out how you will add Micro-interactions, Smart Defaults, Contextual Help, etc.
4. **Implement** the feature with live data, ensuring the design aesthetics (Premium, Vibrant, Glassmorphism, Modern Typography) are maintained.
