const fs = require('fs');

const filesToFix = [
  'src/components/dashboard/home/DashboardHome.tsx',
  'src/components/dashboard/home/ActivityFeed.tsx',
  'src/components/dashboard/KPIGrid.tsx',
  'src/components/engine/ContactManager.tsx',
  'src/app/dashboard/projects/new/page.tsx',
  'src/app/dashboard/panels/PipelinePanel.tsx',
  'src/app/dashboard/account/page.tsx'
];

filesToFix.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Add import if needed
  if (!content.includes('useTenant')) {
    content = content.replace(/import\s+\{\s*useAuth\s*\}\s+from\s+['"]@\/context\/AuthContext['"];/, "import { useAuth } from '@/context/AuthContext';\nimport { useTenant } from '@/context/TenantContext';");
  }

  // Add const { activeTenantId } = useTenant(); after const { profile } = useAuth();
  if (content.includes('const { profile') && !content.includes('activeTenantId')) {
    content = content.replace(/const\s+\{\s*([^}]*)profile([^}]*)\s*\}\s*=\s*useAuth\(\);/, "const { $1profile$2 } = useAuth();\n  const { activeTenantId } = useTenant();");
  } else if (content.includes('const { user, profile } = useAuth();') && !content.includes('activeTenantId')) {
    content = content.replace(/const\s+\{\s*user,\s*profile\s*\}\s*=\s*useAuth\(\);/, "const { user, profile } = useAuth();\n  const { activeTenantId } = useTenant();");
  }

  // Replace profile?.organizationId with activeTenantId
  content = content.replace(/profile\?\.organizationId/g, 'activeTenantId');
  content = content.replace(/profile\.organizationId/g, 'activeTenantId');

  fs.writeFileSync(file, content);
});
console.log('Components updated.');
