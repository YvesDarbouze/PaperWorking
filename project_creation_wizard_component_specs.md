# Project Creation Wizard: Component-Level Specifications

## 1. Progress Indicator
- **Anatomy**: A five-segment horizontal bar.
- **Dimensions**: Each segment is 4px tall; 8px gap between segments.
- **Color Logic**:
    - **Filled**: `primary` (#2dd4bf)
    - **Unfilled**: `muted-border` (outline/30)
- **Active State**: The segment for the current step is highlighted with a 2px-tall accent line directly beneath it.
- **Animation**: Fill animates with a 240ms ease-out on "Continue →".

## 2. Navigation & Controls
- **Back Button**: 
    - Visible from Step 2 through Step 5.
    - Preserves all state on the current step.
    - Animation: Slide-right transition.
- **Primary CTA**: 
    - "Continue →" (Steps 1-4).
    - "Enter the [Phase] workspace →" (Step 5).
    - Sticky bottom position on mobile.

## 3. Keyboard Navigation
- **Tab**: Cycle fields in document order.
- **Enter**: Advance to next field or Primary CTA.
- **Esc**: Trigger dismiss/abandon confirmation.
- **Arrow Keys**: Adjust slider values in Step 4.
- **Cmd/Ctrl + Enter**: Global "Continue" shortcut (if enabled).

## 4. Mobile Adaptations
- **Layout**: Replace desktop modal with a full-screen sheet.
- **Selection Components**:
    - **Step 2 (Phase)**: Stack cards vertically; full-width tap targets.
    - **Step 3 (Strategy)**: Stack cards vertically.
- **Input Fallback**: Step 4 slider includes a numeric input field for high-precision entry.

## 5. Animation Timings
- **Modal Entry**: 280ms fade + scale (96% → 100%).
- **Modal Exit**: 240ms fade + scale (100% → 96%).
- **Forward Step**: 240ms left-slide.
- **Backward Step**: 240ms right-slide.
- **Expanders**: 240ms slide-down (Step 3 definitions, Step 4 partners).

## 6. Accessibility
- **Labels**: Persistent visible labels for all inputs (no placeholder-only fields).
- **State Indicators**: Use icon glyphs (checkmarks, warnings) alongside color.
- **Focus**: Trap focus within the wizard container until dismissed.
- **Screen Readers**: Announce step changes and confirmation prompts.