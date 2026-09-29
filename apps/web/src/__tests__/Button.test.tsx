import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import Button from '../../components/ui/Button.js';

describe('Canonical Button Component Unit Suite (shadcn buFzlTs / radix-lyra)', () => {
  describe('1. Visual Hierarchy & Variant Class Application', () => {
    it('applies primary/default variant classes and data attribute', () => {
      const html = renderToString(<Button variant="primary">Primary Action</Button>);
      expect(html).toContain('data-slot="button"');
      expect(html).toContain('bg-primary');
      expect(html).toContain('text-primary-foreground');
      expect(html).toContain('hover:bg-primary/80');
      expect(html).not.toContain('bg-[#00DD94]');
    });

    it('applies secondary/outline variant classes (default)', () => {
      const html = renderToString(<Button>Secondary Action</Button>);
      expect(html).toContain('data-slot="button"');
      expect(html).toContain('border-border');
      expect(html).toContain('hover:bg-muted');
    });

    it('applies tertiary/ghost variant classes', () => {
      const html = renderToString(<Button variant="tertiary">Tertiary Action</Button>);
      expect(html).toContain('data-slot="button"');
      expect(html).toContain('border-transparent');
      expect(html).toContain('hover:bg-muted');
    });

    it('applies destructive/danger variant classes', () => {
      const html = renderToString(<Button variant="danger">Delete</Button>);
      expect(html).toContain('data-slot="button"');
      expect(html).toContain('bg-destructive/10');
      expect(html).toContain('text-destructive');
    });
  });

  describe('2. Sizes & Sizing Dimensions (Radix Lyra Architecture)', () => {
    it('applies sm size classes', () => {
      const html = renderToString(<Button size="sm">Small</Button>);
      expect(html).toContain('data-size="sm"');
      expect(html).toContain('h-7');
    });

    it('applies md/default size classes', () => {
      const html = renderToString(<Button size="md">Medium</Button>);
      expect(html).toContain('data-size="md"');
      expect(html).toContain('h-8');
    });

    it('applies lg size classes', () => {
      const html = renderToString(<Button size="lg">Large</Button>);
      expect(html).toContain('data-size="lg"');
      expect(html).toContain('h-9');
    });
  });

  describe('3. Functional Roles Composition', () => {
    it('roleVariant="cta" enforces primary variant and lg size with Lyra styling', () => {
      const html = renderToString(<Button roleVariant="cta">Explore Deals</Button>);
      expect(html).toContain('data-slot="button"');
      expect(html).toContain('bg-primary');
      expect(html).toContain('h-9');
      expect(html).not.toContain('bg-[#00DD94]');
    });

    it('roleVariant="icon" or isIconOnly renders square aspect ratio', () => {
      const html = renderToString(
        <Button roleVariant="icon" size="sm" aria-label="Refresh">
          R
        </Button>,
      );
      expect(html).toContain('size-7');
      expect(html).toContain('aria-label="Refresh"');
    });

    it('roleVariant="dropdown" renders disclosure chevron', () => {
      const html = renderToString(<Button roleVariant="dropdown">Filter</Button>);
      expect(html).toContain('▼');
    });

    it('roleVariant="toggle" correctly manages aria-pressed attribute', () => {
      const unpressedHtml = renderToString(
        <Button roleVariant="toggle" isPressed={false}>
          Bookmark
        </Button>,
      );
      expect(unpressedHtml).toContain('aria-pressed="false"');

      const pressedHtml = renderToString(
        <Button roleVariant="toggle" isPressed={true}>
          Bookmark
        </Button>,
      );
      expect(pressedHtml).toContain('aria-pressed="true"');
      expect(pressedHtml).toContain('bg-muted');
      expect(pressedHtml).not.toContain('text-[#00DD94]');
    });
  });

  describe('4. States & Accessibility Safeguards', () => {
    it('disabled prop sets aria-disabled="true", disabled attribute, and opacity class', () => {
      const html = renderToString(<Button disabled>Disabled Action</Button>);
      expect(html).toContain('disabled=""');
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain('opacity-50');
      expect(html).toContain('pointer-events-none');
    });

    it('loading prop sets aria-busy="true", disables button, renders spinner, and locks width', () => {
      const html = renderToString(<Button loading>Create Project</Button>);
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain('disabled=""');
      expect(html).toContain('data-testid="button-spinner"');
      expect(html).toContain('animate-spin');
      expect(html).toContain('invisible select-none');
      expect(html).toContain('Create Project');
    });

    it('focus-visible styling applies crisp 1px ring in accordance with Radix Lyra', () => {
      const html = renderToString(<Button>Focus Target</Button>);
      expect(html).toContain('focus-visible:ring-1');
      expect(html).toContain('focus-visible:ring-ring/50');
      expect(html).not.toContain('focus-visible:ring-[#00DD94]/60');
    });
  });
});
