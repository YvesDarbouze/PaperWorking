# PaperWorking Role Hierarchy v3.0

## Overview

PaperWorking enforces a 3-tier user role hierarchy plus an internal Master Admin identity:

### 1. Investor (Solo Investor)
- Creates own projects (solo)
- Own portfolio view
- Can list services & respond to vendor requests
- Can respond to investment opportunities in Deals
- Cannot assign tasks to others (shows upgrade prompt to Investment Team)
- Cannot invite others to Deals (blocked — requires Investment Team)
- Storage: 0.5GB allocated across personal projects

### 2. Investment Team (Multi-User Team)
- Creates team-owned projects
- Assigns tasks to team members and vendors
- Invites others to Deals (recipients must be part of an Investment Team)
- Aggregated Team Portfolio view
- Can generate Tax Reports for team projects
- Manages team roles (CEO, Attorney, Contractor, Property Manager, Accountant, etc.)

### 3. Vendor (Service Provider)
- Cannot create projects or view portfolio
- Receives and completes assigned tasks
- Lists services in Vendor Marketplace
- Can answer vendor requests
- Dual-Role Flexibility: A Vendor can ALSO be a member of an Investment Team

---

## Master Admin (Internal Only — Not a User Tier)
- PaperWorking Customer Service & Management staff ONLY
- Full platform access for support, moderation, billing management
- Impersonation capabilities with audit log
- Cannot be selected during user sign-up

---

## Invitation & Access Rules
1. To be invited to a Deal, a user MUST be part of an Investment Team.
2. Non-subscribers invited to a Deal receive a sign-up prompt to create an Investor account and join an Investment Team.
3. Vendors have two operational paths: standalone service provider or dual-role team member.
