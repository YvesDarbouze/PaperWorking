1. Cấu trúc cấp quyền
PaperWorking Platform
│
├── MASTER_ADMIN
│   └── Quản trị toàn hệ thống
│
├── INVESTOR
│   ├── Owns Projects
│   └── Owns Portfolio
│
├── INVESTMENT_TEAM
│   └── Member of specific Project
│       ├── Team Lead
│       └── Team Member
│
└── VENDOR
    └── Marketplace / Task only

Điểm quan trọng nhất:

Investor là owner của Project. Investment Team không phải role toàn hệ thống, mà là membership trong từng Project.

Ví dụ:

Investor A
   │
   ├── Project A
   │    ├── Investor A
   │    ├── Team Member 1
   │    ├── Team Member 2
   │    └── Vendor X
   │
   └── Project B
        ├── Investor A
        ├── Team Member 3
        └── Vendor Y

Team Member 1 có quyền trong Project A nhưng không tự động nhìn thấy Project B.

2. 4 loại quyền chính
MASTER_ADMIN

Đây là tài khoản nội bộ PaperWorking, không nằm trong user tier của customer.

Có thể:

quản lý Investor
quản lý Investment Team
quản lý Vendor
xem tất cả Projects
xem tất cả Deals
quản lý marketplace
quản lý users
quản lý permissions
audit logs
billing/subscription
system configuration
support/customer management

Có thể coi:

MASTER_ADMIN
    ↓
SYSTEM LEVEL
    ↓
Everything

Không nên dùng MASTER_ADMIN cho khách hàng.

3. INVESTOR

Investor là Project Owner.

Theo sơ đồ của bạn:

Action	Investor
Create Project	✅
Assign Tasks	❌
Receive Tasks	✅
Vendor Marketplace	✅
List Services	✅
View Portfolio	✅
Generate Tax Reports	✅
Respond to Investment Deal	✅
Invite Others to Deal	❌

Nhưng mình đề xuất tinh chỉnh một chút.

Investor nên có:
PROJECT
├── create
├── read
├── update
├── archive
└── delete

với điều kiện:

project.ownerId === currentUser.id

Investor có thể:

tạo Project
xem Project của mình
quản lý thông tin investment
quản lý lifecycle
xem financial metrics
xem reports
xem portfolio
sử dụng Vendor Marketplace
tạo/request task
assign task cho Investment Team
Quan trọng

Sơ đồ hiện tại ghi:

Investor → Assign Tasks ❌

Mình thấy chỗ này nên xem lại.

Nếu Investor là Project Owner thì rất khó để Investor không được assign task.

Có thể thiết kế:

Investor
    ↓
Create Task
    ↓
Assign Task
    ↓
Investment Team

Còn nếu business muốn mọi task phải thông qua Team Lead:

Investor
    ↓
Request Task
    ↓
Team Lead
    ↓
Assign Task

Cách thứ hai phù hợp nếu PaperWorking muốn mô hình quản lý chuyên nghiệp hơn.

4. INVESTMENT TEAM

Đây là phần mình nghĩ bạn nên thiết kế kỹ nhất.

Không nên chỉ có:

role = INVESTMENT_TEAM

Mà nên có:

ProjectMembership

Ví dụ database:

ProjectMembership


id
projectId
userId
role
status
joinedAt

Trong đó:

role:
  TEAM_LEAD
  TEAM_MEMBER

Ví dụ:

Project A
│
├── Investor
│
├── John
│   └── TEAM_LEAD
│
├── Mike
│   └── TEAM_MEMBER
│
└── David
    └── TEAM_MEMBER
5. TEAM_LEAD

Nếu bạn muốn hệ thống có tính enterprise thì mình rất khuyên thêm TEAM_LEAD.

TEAM_LEAD

Có thể:

xem Project
xem Project data
xem investment information
nhận task
tạo task
assign task
reassign task
quản lý Team Member
xem progress
cập nhật task
respond investment deal
xem metrics
xem reports

Nhưng:

❌ Create Project
❌ Transfer Project ownership
❌ Delete Project
❌ Manage billing
❌ System administration
6. TEAM_MEMBER

Team Member chỉ có quyền trong project mà họ được invite.

Ví dụ:

Project A
    ↓
Team Member
    ↓
Tasks

Có thể:

xem Project được phép
xem task được assign
nhận task
update task
upload documents
comment
cập nhật progress
xem những data cần thiết cho công việc

Không nên cho:

❌ Create Project
❌ Delete Project
❌ Invite arbitrary users
❌ Manage billing
❌ Manage ownership
❌ View unrelated projects
7. VENDOR

Vendor hoàn toàn khác Investor/Team.

Vendor không phải Project member theo mặc định.

Sơ đồ của bạn ghi rất đúng:

Task-Only · Marketplace · No Project Creation

Tức là:

Vendor
   ↓
Marketplace
   ↓
Service
   ↓
Task

Vendor có thể:

tạo/list service
xem marketplace
nhận task
xem task được giao
update task status
gửi deliverables
communicate với Project Team

Nhưng:

❌ Create Project
❌ View Portfolio
❌ Generate Tax Reports
❌ View all Project financial data
❌ Respond to Investment Deal
8. Cực kỳ quan trọng: Vendor không được thấy toàn bộ Project

Ví dụ:

Project A


Financial Data
$2,000,000
Cap Rate
NOI
IRR
Cash Flow
DSCR

Vendor được giao:

Fix HVAC
Budget: $5,000
Deadline: Aug 30
Location: ...

Vendor không nhất thiết được nhìn:

NOI
IRR
DSCR
Cap Rate
Equity
Investment structure
Investor information
Tax reports

Cho nên permission nên có data scope.

9. Mình sẽ chia permission thành 4 tầng

Thay vì:

if role === "INVESTOR"

nên có:

ROLE
+
RESOURCE
+
ACTION
+
SCOPE

Ví dụ:

INVESTOR
PROJECT
READ
OWN

hoặc:

TEAM_MEMBER
TASK
UPDATE
ASSIGNED

hoặc:

VENDOR
TASK
READ
ASSIGNED
10. Permission model

Có thể xây như:

Permission
├── resource
├── action
└── scope
Resource
PROJECT
PROJECT_DATA
TEAM
TASK
DEAL
VENDOR
SERVICE
PORTFOLIO
REPORT
TAX_REPORT
METRICS
DOCUMENT
COMMENT
Action
CREATE
READ
UPDATE
DELETE
ASSIGN
INVITE
APPROVE
RESPOND
EXPORT
Scope
SYSTEM
OWN
MEMBER
ASSIGNED
PROJECT
MARKETPLACE
11. Ví dụ permission thực tế
Investor
PROJECT.CREATE
PROJECT.READ.OWN
PROJECT.UPDATE.OWN
PROJECT.DELETE.OWN


PROJECT_DATA.READ.OWN


TEAM.READ.OWN
TEAM.INVITE.OWN


TASK.CREATE.OWN
TASK.READ.OWN
TASK.UPDATE.OWN


DEAL.READ.OWN
DEAL.RESPOND.OWN


VENDOR.READ.MARKETPLACE
SERVICE.READ.MARKETPLACE


PORTFOLIO.READ.OWN


REPORT.READ.OWN
REPORT.EXPORT.OWN


TAX_REPORT.READ.OWN
TAX_REPORT.EXPORT.OWN
Team Lead
PROJECT.READ.MEMBER
PROJECT_DATA.READ.MEMBER


TEAM.READ.MEMBER
TEAM.INVITE.PROJECT


TASK.CREATE.PROJECT
TASK.READ.PROJECT
TASK.UPDATE.PROJECT
TASK.ASSIGN.PROJECT


DEAL.READ.PROJECT
DEAL.RESPOND.PROJECT


REPORT.READ.PROJECT
METRICS.READ.PROJECT
DOCUMENT.READ.PROJECT
Team Member
PROJECT.READ.MEMBER


TASK.READ.ASSIGNED
TASK.UPDATE.ASSIGNED


DOCUMENT.READ.ASSIGNED
DOCUMENT.CREATE.ASSIGNED


COMMENT.CREATE.PROJECT
Vendor
SERVICE.CREATE.OWN
SERVICE.UPDATE.OWN
SERVICE.DELETE.OWN


TASK.READ.ASSIGNED
TASK.UPDATE.ASSIGNED


DOCUMENT.READ.ASSIGNED
DOCUMENT.CREATE.ASSIGNED


COMMENT.CREATE.ASSIGNED
12. Investment Deal cần permission riêng

Trong hình có:

To be invited to a Deal, a user must be part of an Investment Team.

Mình sẽ implement rule này ở backend:

User
   ↓
InvestmentTeamMembership
   ↓
Project
   ↓
Deal

Ví dụ:

Deal #123
Project A


Investor
    └── owner


Investment Team
    ├── John
    ├── Mike
    └── David


Vendor
    └── ❌

Nếu Vendor gọi:

GET /api/deals/123

backend phải reject.

Không được chỉ hide UI.

13. RBAC + ABAC sẽ phù hợp hơn RBAC thuần

PaperWorking của bạn thực chất nên dùng:

RBAC + Resource Ownership + Project Membership + Context Rules

Ví dụ:

RBAC
  ↓
Investor / Team Lead / Team Member / Vendor


        +


Ownership
  ↓
project.ownerId


        +


Membership
  ↓
project.members


        +


Assignment
  ↓
task.assigneeId


        +


Business Rules
  ↓
Deal requires Investment Team membership

Đây mới là mô hình phù hợp với sơ đồ này.

14. Backend nên kiểm tra như thế nào?

Ví dụ API:

POST /api/projects

→ chỉ:

INVESTOR
MASTER_ADMIN
PATCH /api/projects/:id

→ cho:

MASTER_ADMIN
OR
INVESTOR where project.ownerId === user.id
POST /api/projects/:id/tasks

→ cho:

INVESTOR owner
TEAM_LEAD member
PATCH /api/tasks/:id

→ cho:

MASTER_ADMIN
TASK_ASSIGNEE
TEAM_LEAD
PROJECT_OWNER
GET /api/deals/:id

→ check:

MASTER_ADMIN
OR
PROJECT_OWNER
OR
INVESTMENT_TEAM_MEMBER

Vendor → 403.

15. Lifecycle Phase cũng nên có permission

Cái này rất quan trọng vì hệ thống của bạn có:

Acquisition
     ↓
Fund
     ↓
Hold
     ↓
Exit

Không phải user nào cũng được thay đổi phase.

Ví dụ:

INVESTOR
    ↓
can advance lifecycle


TEAM_LEAD
    ↓
can update operational data


TEAM_MEMBER
    ↓
can update assigned work


VENDOR
    ↓
can update vendor task

Ví dụ Project đang:

HOLD

Vendor không thể tự chuyển:

HOLD → EXIT
16. Mình sẽ tổ chức database như này
User
 ├── id
 ├── email
 └── ...


Organization
 ├── id
 └── ...


OrganizationMember
 ├── organizationId
 ├── userId
 └── role


Project
 ├── id
 ├── organizationId
 ├── ownerId
 └── lifecyclePhase


ProjectMember
 ├── projectId
 ├── userId
 └── role


Task
 ├── projectId
 ├── assigneeId
 └── vendorId


Deal
 ├── projectId
 └── ...


VendorService
 ├── vendorId
 └── ...


Permission
 ├── resource
 ├── action
 └── scope

Và quan hệ quan trọng:

Organization
     │
     ├── Investor
     │
     ├── Projects
     │      │
     │      ├── ProjectMember
     │      │      ├── TEAM_LEAD
     │      │      └── TEAM_MEMBER
     │      │
     │      ├── Tasks
     │      │
     │      ├── Deals
     │      │
     │      └── Project Data
     │
     └── Vendors
Tóm lại

Nếu đây là PaperWorking hiện tại, mình không khuyên chỉ tạo 4 enum:

SUPER_ADMIN
INVESTOR
INVESTMENT_TEAM
VENDOR

Mà nên tách thành:

SYSTEM ROLE
────────────
MASTER_ADMIN


CUSTOMER ROLE
─────────────
INVESTOR


PROJECT ROLE
────────────
TEAM_LEAD
TEAM_MEMBER


MARKETPLACE ROLE
────────────────
VENDOR

và authorization phải kiểm tra:

User
 ↓
Role
 ↓
Organization
 ↓
Project ownership / membership
 ↓
Resource
 ↓
Action
 ↓
Scope
 ↓
Business rule

Đây sẽ khớp với sơ đồ bạn gửi hơn rất nhiều, đồng thời sau này thêm Support, Compliance, Billing, Asset Manager, Property Manager... cũng không phải đập lại toàn bộ RBAC.