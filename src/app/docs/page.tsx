"use client";

import { ReactNode } from 'react';
import {
    BookOpen,
    Camera,
    FileText,
    MapPin,
    Globe,
    Users,
    PlusCircle,
    CheckCircle2,
    AlertTriangle,
    Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

// ─── Reusable building blocks ──────────────────────────────────────────────

function Screenshot({ label, caption }: { label: string; caption: string }) {
    return (
        <div className="my-4 rounded-xl border-2 border-dashed border-border/60 bg-muted/20 p-6 flex flex-col items-center justify-center text-center gap-2">
            <Camera className="w-6 h-6 text-muted-foreground/50" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">{label}</p>
            <p className="text-xs text-muted-foreground max-w-md">{caption}</p>
        </div>
    );
}

function Shot({ src, alt, caption }: { src: string; alt: string; caption: string }) {
    return (
        <div className="my-4 rounded-xl border border-border/50 overflow-hidden">
            <img src={src} alt={alt} className="w-full" />
            <p className="text-xs text-muted-foreground text-center py-2 bg-muted/20 px-4">{caption}</p>
        </div>
    );
}

function Steps({ items }: { items: ReactNode[] }) {
    return (
        <ol className="space-y-3 my-3">
            {items.map((item, i) => (
                <li key={i} className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-brand-blue-crayola/10 text-brand-blue-crayola text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                    </span>
                    <div className="text-sm text-foreground leading-relaxed">{item}</div>
                </li>
            ))}
        </ol>
    );
}

function Callout({ tone, children }: { tone: 'info' | 'warning' | 'success'; children: ReactNode }) {
    const config = {
        info: { icon: Info, className: 'bg-brand-blue-crayola/5 border-brand-blue-crayola/20 text-foreground' },
        warning: { icon: AlertTriangle, className: 'bg-yellow-500/5 border-yellow-500/20 text-foreground' },
        success: { icon: CheckCircle2, className: 'bg-green-500/5 border-green-500/20 text-foreground' },
    }[tone];
    const Icon = config.icon;
    return (
        <div className={`flex gap-3 rounded-lg border p-4 my-3 text-sm ${config.className}`}>
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{children}</div>
        </div>
    );
}

function StatusPill({ color, label }: { color: 'green' | 'yellow' | 'red' | 'gray' | 'blue'; label: string }) {
    const classes = {
        green: 'bg-green-500/10 text-green-600 border-green-500/25',
        yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/25',
        red: 'bg-destructive/10 text-destructive border-destructive/25',
        gray: 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/25',
        blue: 'bg-brand-blue-crayola/10 text-brand-blue-crayola border-brand-blue-crayola/25',
    }[color];
    return <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border ${classes}`}>{label}</span>;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-brand-blue-crayola/10 rounded-xl">
                            <BookOpen className="w-6 h-6 text-brand-blue-crayola" />
                        </div>
                        <h1 className="text-3xl font-bold text-foreground">Skywide Help Center</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Step-by-step guides for using Skywide day to day. Pick the tab that matches your role — everything below reflects exactly how the app works today.
                    </p>
                </div>

                <Tabs defaultValue="content" className="w-full">
                    <TabsList className="mb-6">
                        <TabsTrigger value="content" className="gap-2">
                            <FileText className="w-4 h-4" /> Content Team
                        </TabsTrigger>
                        <TabsTrigger value="am" className="gap-2">
                            <Users className="w-4 h-4" /> Account Managers
                        </TabsTrigger>
                    </TabsList>

                    {/* ══════════════════════════ CONTENT TEAM ══════════════════════════ */}
                    <TabsContent value="content" className="space-y-6">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">What this covers</CardTitle>
                                <CardDescription>
                                    If your job is submitting content requests on the Dashboard, this is the only section you need. The other automations (GBP, Indexing, Content Briefs) are run by Account Managers — see that tab if you're ever asked about them.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="border-border/50 shadow-sm">
                            <CardContent className="pt-6">
                                <Accordion type="multiple" defaultValue={['submit']} className="w-full">

                                    <AccordionItem value="submit">
                                        <AccordionTrigger className="text-base font-bold">
                                            1. Submitting a Content Request
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <Steps
                                                items={[
                                                    <>Go to <strong>Dashboard</strong> in the sidebar.</>,
                                                    <>
                                                        In the <strong>Client</strong> field, start typing the client's name and pick them from the list.
                                                        If the client already has a website and industry saved, those two fields fill in automatically — you don't need to retype them.
                                                    </>,
                                                    <>
                                                        Can't find the client? Click the small <strong>+</strong> next to the Client field, or the <strong>Add Client</strong> button above the form. A short pop-up asks for just three things: <strong>Client Name</strong>, <strong>Website URL</strong>, and <strong>Industry</strong> (the last two are optional). Save it and the client is instantly available to pick.
                                                    </>,
                                                    <>Fill in the rest of the brief the way you normally would (creative brief, page intent, article type, etc.).</>,
                                                    <>Click <strong>Submit</strong>. The request is created immediately and handed off to the writing automation — you don't need to do anything else.</>,
                                                ]}
                                            />
                                            <Shot
                                                src="/docs/dashboard-content-request-form.png"
                                                alt="Dashboard Content Submission Form showing the Client field with a searchable dropdown and Add Client + button, plus the Industry field."
                                                caption="Dashboard content request form — Client field with the searchable dropdown and Add Client button, plus Industry."
                                            />
                                            <Shot
                                                src="/docs/add-client-content-request-modal.png"
                                                alt="Add Client — Content Requests pop-up with three fields: Client Name, Website URL, Industry."
                                                caption="The Add Client pop-up — just three fields: Client Name, Website URL, Industry."
                                            />
                                            <Callout tone="info">
                                                If you type a name that already exists anywhere in Skywide (even one only set up for GBP or Indexing before), it'll show up in a dropdown under the name field so you can select it instead of accidentally creating a second, duplicate client record.
                                            </Callout>
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="track">
                                        <AccordionTrigger className="text-base font-bold">
                                            2. Tracking Your Request
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p className="text-sm text-foreground mb-3">
                                                Go to <strong>My Requests</strong> in the sidebar to see everything you've submitted and where it stands. A request moves through these stages automatically — there's no manual approval step in between, so you don't need to wait for anyone to "release" it:
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2 my-4">
                                                <StatusPill color="gray" label="Pending" />
                                                <span className="text-muted-foreground text-xs">→</span>
                                                <StatusPill color="blue" label="In Progress" />
                                                <span className="text-muted-foreground text-xs">→</span>
                                                <StatusPill color="green" label="Complete" />
                                            </div>
                                            <ul className="space-y-2 text-sm text-foreground list-disc pl-5">
                                                <li><strong>Pending</strong> — just submitted, about to start.</li>
                                                <li><strong>In Progress</strong> — the automation is actively writing it.</li>
                                                <li><strong>Complete</strong> — done. A Google Drive folder link appears on the request — that's your delivered content.</li>
                                                <li><strong>Cancelled / Error</strong> — something went wrong. See below.</li>
                                            </ul>
                                            <Shot
                                                src="/docs/my-requests-status.png"
                                                alt="My Requests page showing the Status column with In Progress and Complete rows."
                                                caption="My Requests — the Status column shows exactly where each request stands."
                                            />
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="issues">
                                        <AccordionTrigger className="text-base font-bold">
                                            3. If Something Goes Wrong (or Needs Changes)
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <ul className="space-y-3 text-sm text-foreground">
                                                <li>
                                                    <strong>Request shows Cancelled/Error:</strong> open it on My Requests and click <strong>Retry</strong> — this re-runs the same request without you having to resubmit the whole form.
                                                </li>
                                                <li>
                                                    <strong>Request is Complete but needs changes:</strong> click <strong>Request Revision</strong>, add a short note on what to change, and it automatically reruns with your notes included.
                                                </li>
                                            </ul>
                                            <Screenshot
                                                label="Screenshot 4"
                                                caption="A completed request card showing the Retry and Request Revision buttons."
                                            />
                                        </AccordionContent>
                                    </AccordionItem>

                                </Accordion>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ══════════════════════════ ACCOUNT MANAGERS ══════════════════════════ */}
                    <TabsContent value="am" className="space-y-6">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">What this covers</CardTitle>
                                <CardDescription>
                                    GBP Posts, Indexing, and Content Briefs — the three automations Account Managers set up, run, and (for GBP) review. Every client used by any of these lives in one shared record, managed from the Clients page.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="border-border/50 shadow-sm">
                            <CardContent className="pt-6">
                                <Accordion type="multiple" defaultValue={['clients']} className="w-full">

                                    <AccordionItem value="clients">
                                        <AccordionTrigger className="text-base font-bold">
                                            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> 1. Client Management — the one place for everything</span>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p className="text-sm text-foreground mb-3">
                                                Go to <strong>Clients</strong> in the sidebar. Every client is a single record shared by Content, GBP, and Indexing — turning a service on or off, and editing that service's settings, all happens on the same record instead of three separate systems.
                                            </p>
                                            <Steps
                                                items={[
                                                    <>Click anywhere on a client's row to open their full edit page — every field for every service they use, all in one form.</>,
                                                    <>Under each active service, a small colored dot shows real activity, not just whether it's turned on — so you can tell at a glance which clients need attention without opening each automation separately.</>,
                                                ]}
                                            />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
                                                <div className="rounded-lg border border-border/50 p-3 text-xs space-y-1.5">
                                                    <p className="font-bold text-foreground mb-1">Indexing dot</p>
                                                    <p><StatusPill color="green" label="Green" /> — ran successfully within 14 days</p>
                                                    <p><StatusPill color="yellow" label="Yellow" /> — succeeded, but it's been a while</p>
                                                    <p><StatusPill color="red" label="Red" /> — the last run actually failed</p>
                                                    <p><StatusPill color="gray" label="Gray" /> — never run yet</p>
                                                </div>
                                                <div className="rounded-lg border border-border/50 p-3 text-xs space-y-1.5">
                                                    <p className="font-bold text-foreground mb-1">GBP dot</p>
                                                    <p><StatusPill color="green" label="Green" /> — posted within 14 days</p>
                                                    <p><StatusPill color="yellow" label="Yellow" /> — posted, but 14–45 days ago</p>
                                                    <p><StatusPill color="red" label="Red" /> — nothing in 45+ days</p>
                                                    <p className="text-muted-foreground">Plus a note when drafts are waiting on your review.</p>
                                                </div>
                                            </div>
                                            <Shot
                                                src="/docs/clients-status-dots.png"
                                                alt="Clients page table showing rows with status text under each active service, e.g. '1 pending', '10 days ago', 'Up to date', 'No requests yet'."
                                                caption="Clients page — status shown under each active service (e.g. '10 days ago' for a healthy Indexing client, '1 pending' for Content)."
                                            />
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="gbp">
                                        <AccordionTrigger className="text-base font-bold">
                                            <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> 2. GBP Posts</span>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p className="text-sm text-foreground mb-3">
                                                Auto-generates Google Business Profile post drafts for a client from their topics sheet. <strong>This is the one automation with a real review step</strong> — nothing goes out without you looking at it first.
                                            </p>

                                            <p className="text-sm font-semibold text-foreground mt-4 mb-1">Setting up a client</p>
                                            <p className="text-sm text-foreground">
                                                Turn on GBP for the client and fill in their <strong>Google Sheet ID</strong> — this is required, since post generation reads the client's topics straight from that sheet. Key Selling Point and Sitemap URL are optional but improve post quality.
                                            </p>

                                            <p className="text-sm font-semibold text-foreground mt-4 mb-1">Generating posts</p>
                                            <Steps
                                                items={[
                                                    <>Go to <strong>GBP → Generate Posts</strong>.</>,
                                                    <>Pick the client (and location, if they have more than one).</>,
                                                    <>Click <strong>Generate Posts</strong>. Drafts start appearing within moments as each one finishes.</>,
                                                ]}
                                            />

                                            <p className="text-sm font-semibold text-foreground mt-4 mb-1">Reviewing drafts (your part)</p>
                                            <Steps
                                                items={[
                                                    <>Go to <strong>GBP → Posts</strong> tab.</>,
                                                    <>Every new post lands as <StatusPill color="gray" label="Draft" />.</>,
                                                    <>Read it, then click the checkmark to <strong>Approve</strong> it, or the X to <strong>Request Changes</strong> (sends it back to Draft).</>,
                                                ]}
                                            />
                                            <Screenshot
                                                label="Screenshot 6"
                                                caption="GBP Generate page — client/location picker and the Generate Posts button."
                                            />
                                            <Screenshot
                                                label="Screenshot 7"
                                                caption="GBP Posts tab showing a Draft post with the Approve (check) and Request Changes (X) buttons."
                                            />
                                            <Callout tone="warning">
                                                Approved is currently the final state — automatic publishing straight to Google isn't live yet, so once a post is Approved it's ready to be posted through your normal channel.
                                            </Callout>
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="indexing">
                                        <AccordionTrigger className="text-base font-bold">
                                            <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> 3. Indexing</span>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p className="text-sm text-foreground mb-3">
                                                Submits a client's page URLs to Google and Bing so new/updated pages get crawled and indexed faster. This one is purely technical — <strong>there's no editorial review step</strong>, nothing to approve.
                                            </p>

                                            <p className="text-sm font-semibold text-foreground mt-4 mb-1">Setting up a client</p>
                                            <p className="text-sm text-foreground">
                                                Turn on Indexing and fill in the <strong>Workbook URL</strong> and <strong>GSC Property</strong> — both required, since the automation can't run without knowing which sheet of URLs to read and which Search Console property to submit to. Bing Site URL is optional; leave it blank to skip Bing.
                                            </p>

                                            <p className="text-sm font-semibold text-foreground mt-4 mb-1">Running it</p>
                                            <Steps
                                                items={[
                                                    <>Go to <strong>Indexing → Run</strong>, pick the client, and click <strong>Run Indexing</strong>.</>,
                                                    <>URLs submit immediately; the run finishes as <StatusPill color="green" label="Success" /> or <StatusPill color="red" label="Error" />.</>,
                                                ]}
                                            />
                                            <Callout tone="info">
                                                Indexing also runs itself automatically — any client that hasn't run in 14+ days gets picked up overnight, so you don't have to remember to run every client by hand. You'll see an <StatusPill color="blue" label="Auto" /> or <StatusPill color="gray" label="Manual" /> tag on each run showing which one triggered it.
                                            </Callout>
                                            <Shot
                                                src="/docs/indexing-run-history.png"
                                                alt="Indexing Run page showing the Client Selection panel and a Run History table with Auto tags, Success status, and Google/Bing submission counts."
                                                caption="Indexing → Run — Run History shows each run's Auto/Manual trigger, Success/Error status, and Google/Bing counts."
                                            />
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="briefs">
                                        <AccordionTrigger className="text-base font-bold">
                                            <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> 4. Content Briefs</span>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p className="text-sm text-foreground mb-3">
                                                Bulk-generates SEO research briefs — one Google Doc per keyword row in a client's workbook. Like Indexing, this runs fully automatically with <strong>no approval step before a brief is marked done</strong> — the Doc itself is the deliverable, and any editorial review happens inside that Doc afterward.
                                            </p>

                                            <p className="text-sm font-semibold text-foreground mt-4 mb-1">Setting up a client</p>
                                            <p className="text-sm text-foreground">
                                                Turn on Content and fill in both the <strong>Workbook URL</strong> and <strong>Drive Folder URL</strong> — both required, since brief generation can't run without knowing which sheet to read rows from and which Drive folder to save the finished Docs into.
                                            </p>

                                            <p className="text-sm font-semibold text-foreground mt-4 mb-1">Generating and monitoring</p>
                                            <Steps
                                                items={[
                                                    <>Go to <strong>Content Briefs → Generate</strong>, pick the client, and click <strong>Generate</strong>.</>,
                                                    <>Watch progress on the <strong>Content Briefs</strong> (Research History) page — each row moves <StatusPill color="gray" label="New" /> → <StatusPill color="blue" label="In Progress" /> → <StatusPill color="green" label="Done" /> (with the finished Doc link) or <StatusPill color="red" label="Error" />.</>,
                                                ]}
                                            />
                                            <Callout tone="warning">
                                                If a row sits "In Progress" for more than 6 minutes, it's flagged <strong>Stuck</strong> — click <strong>Restart</strong> to give it another attempt. As a backstop, anything still stuck past 10 minutes gets auto-marked Error on its own, so nothing hangs forever unnoticed.
                                            </Callout>
                                            <Shot
                                                src="/docs/content-briefs-research-history.png"
                                                alt="Research History page showing rows with Done and Error status badges and Doc links."
                                                caption="Content Briefs Research History — Done rows link straight to the finished Doc; Error rows are ready for a restart."
                                            />
                                            <Shot
                                                src="/docs/content-briefs-restart-button.png"
                                                alt="Close-up of a Content Briefs row with an Error status, highlighting the Restart button."
                                                caption="An Error (or stuck) row — click the highlighted Restart button to give it another attempt."
                                            />
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="adding">
                                        <AccordionTrigger className="text-base font-bold">
                                            <span className="flex items-center gap-2"><PlusCircle className="w-4 h-4" /> 5. Adding &amp; Editing Clients</span>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p className="text-sm text-foreground mb-3">
                                                Two ways to add or change a client, depending on how much you need to do:
                                            </p>
                                            <ul className="space-y-2 text-sm text-foreground list-disc pl-5">
                                                <li>
                                                    <strong>Quick add</strong> — the <strong>+</strong> or <strong>Add Client</strong> button on any automation page (GBP, Indexing, Content Briefs). Asks only for what that one automation needs, nothing more.
                                                </li>
                                                <li>
                                                    <strong>Full edit</strong> — click any client's row on the <strong>Clients</strong> page to open the full form with every field for every service they use.
                                                </li>
                                            </ul>
                                            <Callout tone="info">
                                                In both places, typing a name that already exists — even one set up under a different automation — shows it in a dropdown so you extend that client's existing record instead of creating a duplicate.
                                            </Callout>
                                            <Shot
                                                src="/docs/client-edit-basic-info-services.png"
                                                alt="Client edit page top section: Basic Info (Client Name, Industry, Website URL) and Active Services toggles for Content Briefs, GBP Posts, Indexing."
                                                caption="Top of the edit page — Basic Info plus the Active Services toggles that reveal each service's config below."
                                            />
                                            <Shot
                                                src="/docs/client-edit-services-config.png"
                                                alt="Full client edit page showing the Content Briefs Config section (Workbook URL, Drive Folder URL, both required) and GBP Config section (Key Selling Point, Sitemap URL, Google Sheet ID required, Topics Tab Name, Locations)."
                                                caption="Each active service gets its own config card below, showing only the fields that service actually needs."
                                            />
                                        </AccordionContent>
                                    </AccordionItem>

                                </Accordion>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
