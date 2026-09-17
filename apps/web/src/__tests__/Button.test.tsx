import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import Button from '../../components/ui/Button.js';

describe('Canonical Button Component Unit Suite', () => {
  describe('1. Visual Hierarchy & Variant Class Application', () => {
    it('applies primary variant classes and data attribute', () => {
      const html = renderToString(<Button variant="primary">Primary Action</Button>);
      expect(html).toContain('data-variant="primary"');
      expect(html).toContain('bg-[#00DD94]');
      expect(html).toContain('text-[#0a0a0f]');
      expect(html).toContain('hover:shadow-[0_0_16px_rgba(0,221,148,0.35)]');
    });

    it('applies secondary variant classes (default)', () => {
      const html = renderToString(<Button>Secondary Action</Button>);
      expect(html).toContain('data-variant="secondary"');
      expect(html).toContain('border-white/10');
      expect(html).toContain('text-[#fdfffc]');
    });

    it('applies tertiary variant classes (ghost/text-only)', () => {
      const html = renderToString(<Button variant="tertiary">Tertiary Action</Button>);
      expect(html).toContain('data-variant="tertiary"');
      expect(html).toContain('border-transparent');
      expect(html).toContain('text-[#9E9DA0]');
    });

    it('applies danger variant classes', () => {
      const html = renderToString(<Button variant="danger">Delete</Button>);
      expect(html).toContain('data-variant="danger"');
      expect(html).toContain('bg-[#EF4444]');
      expect(html).toContain('text-white');
    });
  });

  describe('2. Sizes & Sizing Dimensions', () => {
    it('applies sm size classes (32px)', () => {
      const html = renderToString(<Button size="sm">Small</Button>);
      expect(html).toContain('data-size="sm"');
      expect(html).toContain('h-8');
      expect(html).toContain('text-[12px]');
    });

    it('applies md size classes (40px, default)', () => {
      const html = renderToString(<Button size="md">Medium</Button>);
      expect(html).toContain('data-size="md"');
      expect(html).toContain('h-10');
      expect(html).toContain('text-[13px]');
    });

    it('applies lg size classes (48px, conversion)', () => {
      const html = renderToString(<Button size="lg">Large</Button>);
      expect(html).toContain('data-size="lg"');
      expect(html).toContain('h-12');
      expect(html).toContain('text-[14px]');
    });
  });

  describe('3. Functional Roles Composition', () => {
    it('roleVariant="cta" enforces primary variant and lg size', () => {
      const html = renderToString(<Button roleVariant="cta">Explore Deals</Button>);
      expect(html).toContain('data-variant="primary"');
      expect(html).toContain('data-size="lg"');
      expect(html).toContain('h-12');
      expect(html).toContain('bg-[#00DD94]');
    });

    it('roleVariant="icon" or isIconOnly renders square aspect ratio', () => {
      const html = renderToString(
        <Button roleVariant="icon" size="sm" aria-label="Refresh">
          R
        </Button>,
      );
      expect(html).toContain('h-8 w-8 min-w-[32px]');
      expect(html).toContain('p-0');
      expect(html).toContain('aria-label="Refresh"');
    });

    it('roleVariant="dropdown" renders disclosure chevron', () => {
      const html = renderToString(<Button roleVariant="dropdown">Filter</Button>);
      expect(html).toContain('expand_more');
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
      expect(pressedHtml).toContain('text-[#00DD94]');
    });
  });

  describe('4. States & Accessibility Safeguards', () => {
    it('disabled prop sets aria-disabled="true", disabled attribute, and opacity class to block click interaction', () => {
      const html = renderToString(<Button disabled>Disabled Action</Button>);
      expect(html).toContain('disabled=""');
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain('opacity-50');
      expect(html).toContain('pointer-events-none');
      expect(html).toContain('cursor-not-allowed');
    });

    it('loading prop sets aria-busy="true", disables button, renders spinner, and locks width via invisible text wrapper', () => {
      const html = renderToString(<Button loading>Create Project</Button>);
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain('disabled=""');
      expect(html).toContain('data-testid="button-spinner"');
      expect(html).toContain('animate-spin');
      // Label is kept in DOM with invisible class to lock width
      expect(html).toContain('invisible select-none');
      expect(html).toContain('Create Project');
    });

    it('focus-visible styling applies high-contrast 2px green accent ring and offset', () => {
      const html = renderToString(<Button>Focus Target</Button>);
      expect(html).toContain('focus-visible:ring-2');
      expect(html).toContain('focus-visible:ring-[#00DD94]/60');
      expect(html).toContain('focus-visible:ring-offset-2');
    });
  });
});
