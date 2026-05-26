#!/usr/bin/env python3
import os
import argparse

def analyze_file(filepath, src_dir):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return None
    
    relative_path = os.path.relpath(filepath, src_dir)
    
    # Check for Luminous Glass (LG) indicators
    lg_indicators = {
        'glass-card': 'glass-card' in content,
        'glass-panel': 'glass-panel' in content,
        'glass-input': 'glass-input' in content,
        'luminous-button': 'luminous-button' in content,
        'luminous-glow': 'luminous-glow' in content,
        'pw-btn': 'pw-btn' in content,
        'pw-interactive': 'pw-interactive' in content,
        'pw-tab': 'pw-tab' in content,
        'pw-surface': 'pw-surface' in content,
        'pw-input': 'pw-input' in content,
        'backdrop-blur': 'backdrop-blur' in content,
        'rounded-xl': 'rounded-xl' in content,
        'rounded-2xl': 'rounded-2xl' in content,
        'rounded-3xl': 'rounded-3xl' in content,
        'rounded-full': 'rounded-full' in content,
        'hanken': 'hanken' in content.lower(),
        'marketing-context': 'marketing-context' in content,
        'glow-effect': 'glow-effect' in content.lower(),
        'mesh-bg': 'mesh-bg' in content.lower(),
    }
    
    # Check for Old B&W Sharp Design (OLD) indicators
    old_indicators = {
        'rounded-none': 'rounded-none' in content,
        'border-pw-black': 'border-pw-black' in content,
        'border-pw-border': 'border-pw-border' in content,
        'border-black': 'border-black' in content,
        'ag-button': 'ag-button' in content,
        'uppercase tracking-widest': 'uppercase tracking-widest' in content,
        'rounded-0': 'rounded-0' in content,
    }
    
    lg_evidences = [k for k, v in lg_indicators.items() if v]
    old_evidences = [k for k, v in old_indicators.items() if v]
    
    has_lg = len(lg_evidences) > 0
    has_old = len(old_evidences) > 0
    
    # Check if rounded-none is explicitly overriding rounded corner properties
    has_rounded_none = 'rounded-none' in content or 'rounded-0' in content
    
    if has_lg and has_rounded_none:
        status = "Bridge / Mixed Design"
        desc = "Uses Luminous Glass styles (e.g. pw-btn, glass-card) but overrides corners with rounded-none or shadow-none to match the sharp aesthetic."
    elif has_lg and not has_rounded_none:
        status = "Luminous Glass (Adopted)"
        desc = "Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons."
    elif not has_lg and has_old:
        status = "Old B&W Sharp Design"
        desc = "Legacy B&W styling with sharp edges (rounded-none), strict 1px solid borders, and no glass/translucency tokens."
    else:
        # Check defaults
        if 'dashboard' in relative_path:
            status = "Inherited Dashboard (Bridge/Mixed)"
            desc = "Inherits dashboard theme from layout, likely mixed styles."
        else:
            status = "Legacy / Raw Style"
            desc = "Uses custom styled components or raw styling without explicit Luminous Glass or B&W design system tokens."
            
    return {
        'path': relative_path,
        'status': status,
        'description': desc,
        'lg_evidences': lg_evidences,
        'old_evidences': old_evidences,
    }

def main():
    parser = argparse.ArgumentParser(description="Audit UI design styles across Next.js app routes.")
    parser.parser_path = parser.add_argument('--src', default='./src/app', help='Path to src/app directory')
    parser.add_argument('--output', default='./ui_design_audit.md', help='Output path for the markdown report')
    args = parser.parse_args()
    
    src_dir = os.path.abspath(args.src)
    output_file = os.path.abspath(args.output)
    
    if not os.path.exists(src_dir):
        print(f"Error: Source directory '{src_dir}' does not exist.")
        return
        
    pages = []
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file == 'page.tsx':
                filepath = os.path.join(root, file)
                result = analyze_file(filepath, src_dir)
                if result:
                    pages.append(result)
                    
    pages.sort(key=lambda x: x['path'])
    
    total = len(pages)
    adopted = sum(1 for p in pages if p['status'] == "Luminous Glass (Adopted)")
    mixed = sum(1 for p in pages if p['status'] in ["Bridge / Mixed Design", "Inherited Dashboard (Bridge/Mixed)"])
    old = sum(1 for p in pages if p['status'] in ["Old B&W Sharp Design", "Legacy / Raw Style"])
    
    md = []
    md.append("# UI Design Audit: Luminous Glass vs. Old B&W Sharp Design")
    md.append(f"**Audit Timestamp:** 2026-05-26\n")
    md.append("## Executive Summary")
    md.append(f"We audited all **{total} active page files** under `src/app/` to assess their adoption of the new **Luminous Glass** theme (frosted glass, backdrop blur, fully rounded elements, Hanken Grotesk typography) versus the **Old B&W Sharp Design** (sharp edges, pure B&W, strict 1px solid borders, standard HTML elements).")
    md.append("")
    md.append("| Design Status | Count | Percentage | Description |")
    md.append("|---|---|---|---|")
    md.append(f"| **Luminous Glass (Adopted)** | {adopted} | {adopted/total*100:.1f}% | Full adoption of rounded frosted cards, blur effects, pill buttons. |")
    md.append(f"| **Bridge / Mixed Design** | {mixed} | {mixed/total*100:.1f}% | Uses new classes but overrides corners to sharp/rounded-none. |")
    md.append(f"| **Old B&W Sharp Design / Legacy** | {old} | {old/total*100:.1f}% | Sharp-edged B&W elements, lack of frosted glass or modern design tokens. |")
    md.append("")
    md.append("---")
    md.append("")
    md.append("## Mapped Active Routes & Pages")
    md.append("")
    md.append("| Route / Page Path | Design Status | Key Design Tokens & Evidence | Rationale & Styling Elements |")
    md.append("|---|---|---|---|")
    
    for p in pages:
        lg_str = ", ".join(p['lg_evidences']) if p['lg_evidences'] else "None"
        old_str = ", ".join(p['old_evidences']) if p['old_evidences'] else "None"
        evidence = []
        if lg_str != "None":
            evidence.append(f"LG: {lg_str}")
        if old_str != "None":
            evidence.append(f"OLD: {old_str}")
        evidence_str = "<br>".join(evidence) if evidence else "None"
        
        md.append(f"| `{p['path']}` | **{p['status']}** | {evidence_str} | {p['description']} |")
        
    md.append("")
    md.append("---")
    md.append("")
    md.append("## Key Insights & Divergences")
    md.append("")
    md.append("1. **The Root Layout & Global CSS Bridge:**")
    md.append("   - `src/app/layout.tsx` is the foundation. It registers **Hanken Grotesk** as the default `--font-sans` font family, meaning all pages inherit it by default unless overridden.")
    md.append("   - `src/app/globals.css` implements the **Contrast Engine** and custom `.pw-` styles (Frosted Glass panels, `.pw-btn--primary`, `.pw-btn--secondary`, and inputs with rounded corners).")
    md.append("   - `.dashboard-context` in `globals.css` applies glass backdrop filters and `var(--radius-lg)` (16px corners) to cards, sections, dialogs, and popovers globally.")
    md.append("2. **Explicit Overrides in Panels (Bridge/Mixed):**")
    md.append("   - While the dashboard layout is fully equipped with Luminous Glass styling under the hood, the **individual dashboard panel pages** (e.g. `PipelinePanel`, `EvaluationPanel`, `EnginePanel`) explicitly override the rounded corners using the `rounded-none` utility class and strip shadows using `shadow-none`.")
    md.append("   - This creates a **hybrid/mixed aesthetic**: a translucent, blurred background is visible, but the edges are strict and sharp-edged, keeping some of the legacy institutional look.")
    md.append("3. **Marketing Page Divergence:**")
    md.append("   - The landing page (`src/app/page.tsx`) uses `marketing-context` which overrides the typography to **Plus Jakarta Sans** and sets larger, softer border-radii (`--radius-xl: 2.5rem`, `--radius-3xl: 6.25rem`).")
    md.append("   - Other marketing pages like `/about` (`src/app/about/page.tsx`) do *not* use `marketing-context` and follow the old grayscale B&W design system with sharp borders, but occasionally use rounded elements (`rounded-xl` or `rounded-full` buttons) in a non-standardized fashion.")
    md.append("")
    md.append("## Recommendations & Next Reskinning Candidates")
    md.append("")
    md.append("### Phase 1: Clean Up Dashboard Panel Overrides (Highest Priority)")
    md.append("- **Remove `rounded-none` and `shadow-none`** from dashboard panel files (`src/app/dashboard/panels/*Panel.tsx`). Let the `.dashboard-context` card styling rules in `globals.css` define the standard `16px` rounded corners and shadows automatically.")
    md.append("- This will align the interior dashboard pages with the core Luminous Glass aesthetic defined in `DESIGN.md`.")
    md.append("")
    md.append("### Phase 2: Standarize Secondary Pages to Luminous Glass")
    md.append("- **`/about`, `/careers`, `/support`**:")
    md.append("  These pages currently use a legacy black-and-white look. They should be wrapped in `.marketing-context` to adopt the correct Plus Jakarta Sans typography and rounded border-radius layout consistent with the homepage.")
    md.append("- **`/auth` routes (`/login`, `/register`, `/forgot-password`)**:")
    md.append("  These routes have adopted the glass cards (`auth-glass-card`) and pill-shaped luminous buttons, but still contain custom hex colors like `#0b141a` and `#859490`. These should be refactored to use standard visual design tokens.")
    md.append("")
    md.append("### Phase 3: Audit radices/atomic UI components")
    md.append("- Check `src/components/ui/card.tsx` and `src/components/ui/badge.tsx` which currently use hardcoded gray variables (like border `#A5A5A5` or background `#F2F2F2`). Ensure they are properly adapted dynamically or mapped to standard theme classes.")
    
    report_content = "\n".join(md)
    
    try:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        print(f"UI design audit report generated successfully at: {output_file}")
    except Exception as e:
        print(f"Error writing report file: {e}")

if __name__ == "__main__":
    main()
