import React from 'react';
import {
  ChartLineUp,
  Folder,
  Storefront,
  Tag,
  Calculator,
  ChartBar,
  FileText,
  EnvelopeSimple,
  Users,
  Gear,
  CreditCard,
  User,
  SquaresFour,
  Robot,
} from '@/components/icons/PhosphorIcons';

export function getNavPhosphorIcon(id: string, className = 'h-5 w-5') {
  switch (id) {
    case 'portfolio':
      return <ChartLineUp className={className} />;
    case 'projects':
      return <Folder className={className} />;
    case 'marketplace':
    case 'vendor-marketplace':
      return <Storefront className={className} />;
    case 'deals':
      return <Tag className={className} />;
    case 'deal-calculator':
    case 'calculator':
      return <Calculator className={className} />;
    case 'insights':
      return <ChartBar className={className} />;
    case 'reports':
      return <FileText className={className} />;
    case 'inbox':
      return <EnvelopeSimple className={className} />;
    case 'team':
      return <Users className={className} />;
    case 'settings':
      return <Gear className={className} />;
    case 'billing':
      return <CreditCard className={className} />;
    case 'profile':
      return <User className={className} />;
    case 'support':
      return <Robot className={className} />;
    default:
      return <SquaresFour className={className} />;
  }
}
