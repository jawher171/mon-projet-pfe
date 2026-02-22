# Login & User Setup

## Seed Roles (Required)

The `role` table must contain roles with `Nom` values:
- `admin`
- `gestionnaire_de_stock`
- `operateur`

Insert them if missing. Example:
```sql
INSERT INTO role (RoleId, Nom, Description) VALUES 
  (NEWID(), 'admin', 'Full system access'),
  (NEWID(), 'gestionnaire_de_stock', 'Manages inventory'),
  (NEWID(), 'operateur', 'Basic operations');
```

## Seed Users for Testing

Create users in the database with BCrypt-hashed passwords. Use these test accounts (aligned with frontend mock):

| Email | Password | Role |
|-------|----------|------|
| admin@inventaire.ma | admin123 | admin |
| stock@inventaire.ma | stock123 | gestionnaire_de_stock |
| operator@inventaire.ma | operator123 | operateur |

### Generate BCrypt Hash (C#)

```csharp
var hash = BCrypt.Net.BCrypt.HashPassword("admin123");
// Use this hash for MotDePasse in the users table
```

### Seed Permissions (required for Settings & auth)

The frontend expects these permission codes. Seed the `permission` table and link to roles in `rolepermission`:

```sql
-- Insert permissions (use your actual Guid values or NEWID())
DECLARE @view_dashboard UNIQUEIDENTIFIER = NEWID();
DECLARE @manage_movements UNIQUEIDENTIFIER = NEWID();
DECLARE @view_movements UNIQUEIDENTIFIER = NEWID();
DECLARE @manage_alerts UNIQUEIDENTIFIER = NEWID();
DECLARE @view_alerts UNIQUEIDENTIFIER = NEWID();
DECLARE @manage_products UNIQUEIDENTIFIER = NEWID();
DECLARE @view_products UNIQUEIDENTIFIER = NEWID();
DECLARE @manage_sites UNIQUEIDENTIFIER = NEWID();
DECLARE @view_sites UNIQUEIDENTIFIER = NEWID();
DECLARE @scan_barcode UNIQUEIDENTIFIER = NEWID();
DECLARE @basic_entry_exit UNIQUEIDENTIFIER = NEWID();
DECLARE @manage_users UNIQUEIDENTIFIER = NEWID();
DECLARE @manage_roles UNIQUEIDENTIFIER = NEWID();
DECLARE @view_reports UNIQUEIDENTIFIER = NEWID();

INSERT INTO permission (permissionId, Code_p, Description) VALUES
  (@view_dashboard, 'view_dashboard', 'View dashboard'),
  (@manage_movements, 'manage_movements', 'Manage movements'),
  (@view_movements, 'view_movements', 'View movements'),
  (@manage_alerts, 'manage_alerts', 'Manage alerts'),
  (@view_alerts, 'view_alerts', 'View alerts'),
  (@manage_products, 'manage_products', 'Manage products'),
  (@view_products, 'view_products', 'View products'),
  (@manage_sites, 'manage_sites', 'Manage sites'),
  (@view_sites, 'view_sites', 'View sites'),
  (@scan_barcode, 'scan_barcode', 'Scan barcode'),
  (@basic_entry_exit, 'basic_entry_exit', 'Basic entry/exit'),
  (@manage_users, 'manage_users', 'Manage users'),
  (@manage_roles, 'manage_roles', 'Manage roles'),
  (@view_reports, 'view_reports', 'View reports');

-- Link to roles (replace @adminRoleId, @stockRoleId, @operateurRoleId with actual RoleIds from role table)
-- Admin: all permissions
-- Gestionnaire_de_stock: view_dashboard, manage_movements, view_movements, manage_alerts, view_alerts, view_products, view_sites, view_reports
-- Operateur: view_products, scan_barcode, basic_entry_exit
```

If the tables are empty, the login response will have an empty `permissions` array; the frontend falls back to its static role mapping.
