# Etisalat Billing Dashboard
### PJP Restaurants | $0/month | Azure Static Web Apps + Functions

---

## Live URL
`https://etisalat-billing-dashboard.azurestaticapps.net`

---

## One-time setup (15 minutes total)

### 1. Install Azure CLI
| Windows | Mac | Linux |
|---|---|---|
| [Download installer](https://aka.ms/installazurecliwindows) | `brew install azure-cli` | `curl -sL https://aka.ms/InstallAzureCLIDeb \| sudo bash` |

### 2. Run deploy script
```bash
chmod +x deploy.sh
./deploy.sh
```
Done. Script creates everything automatically and prints your live URL.

### 3. Grant admin consent (1 click)
Open the link printed by the script → click **Grant admin consent** → Yes.
This allows the app to send emails and access OneDrive.

---

## How to use the dashboard

### Monthly workflow
1. Open the dashboard URL
2. **Billing alerts tab** → select the billing month (e.g. "May 2026")
3. **Upload & map tab** → drop your Etisalat billing CSV
   - Dashboard auto-detects account number and bill amount columns
   - File is saved to OneDrive/Etisalat documents/2026-05/ automatically
4. Column mapping screen → click **Apply & go to billing**
5. Dashboard shows all employees with their bill vs assigned limit
6. Red "Over limit" entries are highlighted
7. Click **Select over-limit** to select everyone who exceeded their limit
8. Click **Send via Outlook** → preview → confirm
9. Each employee gets a personalised email from elston.dsouza@pjprestaurants.com

### Sync master (pull new employees)
- Click **Sync master** button (top right)
- Reads etisalat_master.csv from OneDrive/Etisalat master/
- Any new rows in the CSV are added to the dashboard automatically

### Add new employee
- Click **Add employee** button
- Fill in: Employee ID, Account number, Name, Designation, Email, Plan
- Employee is added and master CSV is saved to OneDrive automatically

### Edit employee
- Go to **Employee registry** tab
- Click **Edit** on any row
- Changes are saved to OneDrive master automatically

### Document library
- **Documents tab** → click **Refresh from OneDrive**
- All previously uploaded billing files are listed by month
- Click any file → **Load & map** to re-run old billing data

### Email template
- **Email template tab** → choose from 4 templates or write your own
- Use {{variables}} that auto-fill per employee (name, bill amount, limit, etc.)
- Live preview shows exactly what each employee will receive
- Click **Save template** to apply to all future sends

---

## OneDrive folder structure
```
OneDrive (elston.dsouza@pjprestaurants.com)
└── Documents/
    ├── Etisalat master/
    │   └── etisalat_master.csv     ← 313 employees, edit here to add new staff
    └── Etisalat documents/
        ├── 2026-04/
        │   └── billing_april.csv
        ├── 2026-05/
        │   └── billing_may.csv
        └── ...
```

**To add a new employee directly in OneDrive:**
1. Open `OneDrive/Etisalat master/etisalat_master.csv`
2. Add a new row with the employee details
3. Save the file
4. In the dashboard, click **Sync master** — the new employee appears instantly

---

## What emails look like
- **From:** Elston Shon Dsouza <elston.dsouza@pjprestaurants.com>
- **To:** Each employee's individual email address
- **Subject:** Billing Alert — Your Pro plan bill has exceeded the assigned limit
- **Content:** Personalised with their name, account, plan, limit, actual bill, and overage amount
- **Saved to:** Sent Items in elston's Outlook automatically

---

## Cost breakdown
| Service | Cost |
|---|---|
| Azure Static Web Apps | Free forever |
| Azure Functions (API) | 1M calls/month free |
| Azure AD App | Always free |
| **Total** | **$0/month** |

---

## Troubleshooting
| Problem | Fix |
|---|---|
| "Backend offline" badge | Check portal.azure.com → Static Web App → Functions are running |
| Emails not sending (403) | Grant admin consent (Step 3 above) |
| OneDrive errors | Grant admin consent for Files.ReadWrite.All |
| First request slow | Normal — Functions cold-start takes ~3 seconds |
| New employee not showing | Click Sync master button |
