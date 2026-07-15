# Skywide Help Center

Step-by-step guides for using Skywide day to day. This document mirrors the in-app Help Center at `/docs`. Pick the section that matches your role.

> 📸 = a screenshot goes here. Each one is labeled with exactly what to capture — take the screenshot in the live app and drop it in below the label before sharing this doc.

---

## Part 1 — For the Content Team

*If your job is submitting content requests on the Dashboard, this is the only section you need. The other automations (GBP, Indexing, Content Briefs) are run by Account Managers.*

### 1. Submitting a Content Request

1. Go to **Dashboard** in the sidebar.
2. In the **Client** field, start typing the client's name and pick them from the list. If the client already has a website and industry saved, those two fields fill in automatically — you don't need to retype them.
3. Can't find the client? Click the small **+** next to the Client field, or the **Add Client** button above the form. A short pop-up asks for just three things: **Client Name**, **Website URL**, and **Industry** (the last two are optional). Save it and the client is instantly available to pick.
4. Fill in the rest of the brief the way you normally would (creative brief, page intent, article type, etc.).
5. Click **Submit**. The request is created immediately and handed off to the writing automation — you don't need to do anything else.

> 📸 **Screenshot 1** — Dashboard content request form: Client field with the searchable dropdown and the small + button, plus the Website URL / Industry fields showing they auto-filled.

> 📸 **Screenshot 2** — The Add Client pop-up showing its three fields: Client Name, Website URL, Industry.

**Tip:** If you type a name that already exists anywhere in Skywide (even one only set up for GBP or Indexing before), it'll show up in a dropdown under the name field so you can select it instead of accidentally creating a second, duplicate client record.

### 2. Tracking Your Request

Go to **My Requests** in the sidebar to see everything you've submitted and where it stands. A request moves through these stages automatically — there's no manual approval step in between, so you don't need to wait for anyone to "release" it:

**Pending → In Progress → Complete**

- **Pending** — just submitted, about to start.
- **In Progress** — the automation is actively writing it.
- **Complete** — done. A Google Drive folder link appears on the request — that's your delivered content.
- **Cancelled / Error** — something went wrong. See below.

> 📸 **Screenshot 3** — My Requests page with the Status column visible, showing a mix of Pending / In Progress / Complete rows.

### 3. If Something Goes Wrong (or Needs Changes)

- **Request shows Cancelled/Error:** open it on My Requests and click **Retry** — this re-runs the same request without you having to resubmit the whole form.
- **Request is Complete but needs changes:** click **Request Revision**, add a short note on what to change, and it automatically reruns with your notes included.

> 📸 **Screenshot 4** — A completed request card showing the Retry and Request Revision buttons.

---

## Part 2 — For Account Managers

*GBP Posts, Indexing, and Content Briefs — the three automations Account Managers set up, run, and (for GBP) review. Every client used by any of these lives in one shared record, managed from the Clients page.*

### 1. Client Management — the one place for everything

Go to **Clients** in the sidebar. Every client is a single record shared by Content, GBP, and Indexing — turning a service on or off, and editing that service's settings, all happens on the same record instead of three separate systems.

- Click anywhere on a client's row to open their full edit page — every field for every service they use, all in one form.
- Under each active service, a small colored dot shows real activity, not just whether it's turned on — so you can tell at a glance which clients need attention without opening each automation separately.

**Indexing dot:**
- 🟢 Green — ran successfully within 14 days
- 🟡 Yellow — succeeded, but it's been a while
- 🔴 Red — the last run actually failed
- ⚪ Gray — never run yet

**GBP dot:**
- 🟢 Green — posted within 14 days
- 🟡 Yellow — posted, but 14–45 days ago
- 🔴 Red — nothing in 45+ days
- Plus a note when drafts are waiting on your review.

> 📸 **Screenshot 5** — Clients page showing a row with the colored status dots under each active service.

### 2. GBP Posts

Auto-generates Google Business Profile post drafts for a client from their topics sheet. **This is the one automation with a real review step** — nothing goes out without you looking at it first.

**Setting up a client:** Turn on GBP for the client and fill in their **Google Sheet ID** — this is required, since post generation reads the client's topics straight from that sheet. Key Selling Point and Sitemap URL are optional but improve post quality.

**Generating posts:**
1. Go to **GBP → Generate Posts**.
2. Pick the client (and location, if they have more than one).
3. Click **Generate Posts**. Drafts start appearing within moments as each one finishes.

**Reviewing drafts (your part):**
1. Go to **GBP → Posts** tab.
2. Every new post lands as **Draft**.
3. Read it, then click the checkmark to **Approve** it, or the X to **Request Changes** (sends it back to Draft).

> 📸 **Screenshot 6** — GBP Generate page: client/location picker and the Generate Posts button.

> 📸 **Screenshot 7** — GBP Posts tab showing a Draft post with the Approve (check) and Request Changes (X) buttons.

**Note:** Approved is currently the final state — automatic publishing straight to Google isn't live yet, so once a post is Approved it's ready to be posted through your normal channel.

### 3. Indexing

Submits a client's page URLs to Google and Bing so new/updated pages get crawled and indexed faster. This one is purely technical — **there's no editorial review step**, nothing to approve.

**Setting up a client:** Turn on Indexing and fill in the **Workbook URL** and **GSC Property** — both required, since the automation can't run without knowing which sheet of URLs to read and which Search Console property to submit to. Bing Site URL is optional; leave it blank to skip Bing.

**Running it:**
1. Go to **Indexing → Run**, pick the client, and click **Run Indexing**.
2. URLs submit immediately; the run finishes as **Success** or **Error**.

**Tip:** Indexing also runs itself automatically — any client that hasn't run in 14+ days gets picked up overnight, so you don't have to remember to run every client by hand. You'll see an **Auto** or **Manual** tag on each run showing which one triggered it.

> 📸 **Screenshot 8** — Indexing → Run page showing a client's run history with Auto vs Manual tags and Success/Error status.

### 4. Content Briefs

Bulk-generates SEO research briefs — one Google Doc per keyword row in a client's workbook. Like Indexing, this runs fully automatically with **no approval step before a brief is marked done** — the Doc itself is the deliverable, and any editorial review happens inside that Doc afterward.

**Setting up a client:** Turn on Content and fill in both the **Workbook URL** and **Drive Folder URL** — both required, since brief generation can't run without knowing which sheet to read rows from and which Drive folder to save the finished Docs into.

**Generating and monitoring:**
1. Go to **Content Briefs → Generate**, pick the client, and click **Generate**.
2. Watch progress on the **Content Briefs** (Research History) page — each row moves **New → In Progress → Done** (with the finished Doc link) or **Error**.

**Note:** If a row sits "In Progress" for more than 6 minutes, it's flagged **Stuck** — click **Restart** to give it another attempt. As a backstop, anything still stuck past 10 minutes gets auto-marked Error on its own, so nothing hangs forever unnoticed.

> 📸 **Screenshot 9** — Content Briefs Research History page showing status badges (New / In Progress / Done / Error) and a Restart button on a stuck row.

### 5. Adding & Editing Clients

Two ways to add or change a client, depending on how much you need to do:

- **Quick add** — the **+** or **Add Client** button on any automation page (GBP, Indexing, Content Briefs). Asks only for what that one automation needs, nothing more.
- **Full edit** — click any client's row on the **Clients** page to open the full form with every field for every service they use.

**Tip:** In both places, typing a name that already exists — even one set up under a different automation — shows it in a dropdown so you extend that client's existing record instead of creating a duplicate.

> 📸 **Screenshot 10** — Full client edit page showing Basic Info plus the config section for one active service.
