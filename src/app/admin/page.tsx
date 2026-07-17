import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getDirectory, addRecord } from "@/app/actions/directory";
import { getActiveProjects, createProject, getProjectStats } from "@/app/actions/projects";
import { getAllTasks, createTask } from "@/app/actions/tasks";
import { getAllNotes, createNote } from "@/app/actions/notes";
import { getRevenueSummary, addRevenue } from "@/app/actions/revenue";
import { getAllUsers, createUser, updateUserPermissions, resetUserPassword, allowPasswordReset } from "@/app/actions/auth";
import { sendNotification, getAllNotifications } from "@/app/actions/notifications";
import { getActivityLog } from "@/app/actions/log";
import { logoutAction } from "@/app/actions/auth";
import { getAllClients, createClientAccount, updateClientPermissions, resetClientPassword } from "@/app/actions/clients";
import { getAllClientMessages, replyToClientMessage, markMessageRead } from "@/app/actions/messages";
import { postProjectUpdate, getAllProjectUpdates, deleteProjectUpdate } from "@/app/actions/updates";
import MilestoneTracker from "@/components/MilestoneTracker";
import TaskStatusToggle from "@/components/TaskStatusToggle";
import NoteActions from "@/components/NoteActions";
import ProjectStatusToggle from "@/components/ProjectStatusToggle";
import AdminTabs from "@/components/AdminTabs";
import DeleteUserButton from "@/components/DeleteUserButton";
import { revalidatePath } from "next/cache";

export const runtime = "edge";

const priorityStyle: Record<string, string> = {
  high: "bg-red-50 text-red-600 border-red-200",
  medium: "bg-amber-50 text-amber-600 border-amber-200",
  low: "bg-green-50 text-green-600 border-green-200",
};
const roleStyle: Record<string, string> = {
  founder: "bg-purple-50 text-purple-700 border-purple-200",
  team: "bg-blue-50 text-blue-700 border-blue-200",
  partner: "bg-cyan-50 text-cyan-700 border-cyan-200",
  client: "bg-gray-50 text-gray-600 border-gray-200",
  admin: "bg-purple-50 text-purple-700 border-purple-200",
  member: "bg-blue-50 text-blue-700 border-blue-200",
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${className}`}>{children}</div>;
}
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
function Field({ label, name, type = "text", placeholder = "", required = false }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input type={type} name={name} required={required} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50/50" />
    </div>
  );
}
function Select({ label, name, required = false, children }: { label: string; name: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <select name={name} required={required}
        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50/50">
        {children}
      </select>
    </div>
  );
}
function Btn({ label }: { label: string }) {
  return (
    <button type="submit" className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-all duration-200 shadow-sm">
      {label}
    </button>
  );
}

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const [records, projects, tasks, notes, revenue, stats, users, notifications, logs, clients, clientMessages, projectUpdates] = await Promise.all([
    getDirectory(),
    getActiveProjects(),
    getAllTasks(),
    getAllNotes(),
    getRevenueSummary(),
    getProjectStats(),
    getAllUsers(),
    getAllNotifications(),
    getActivityLog(200),
    getAllClients(),
    getAllClientMessages(),
    getAllProjectUpdates(),
  ]);

  // rename to avoid collision with getAllClients result
  const clients_dir = (records as any[]).filter((r) => r.role === "client");
  const today = new Date().toISOString().split("T")[0];

  async function handleRecord(fd: FormData) { "use server"; await addRecord(fd); revalidatePath("/admin"); }
  async function handleProject(fd: FormData) { "use server"; await createProject(fd); revalidatePath("/admin"); }
  async function handleTask(fd: FormData) { "use server"; await createTask(fd); revalidatePath("/admin"); }
  async function handleNote(fd: FormData) { "use server"; await createNote(fd); revalidatePath("/admin"); }
  async function handleRevenue(fd: FormData) { "use server"; await addRevenue(fd); revalidatePath("/admin"); }
  async function handleCreateUser(fd: FormData) { "use server"; await createUser(fd); revalidatePath("/admin"); }
  async function handleNotification(fd: FormData) { "use server"; await sendNotification(fd); revalidatePath("/admin"); }
  async function handlePermissions(fd: FormData) { "use server"; await updateUserPermissions(fd); revalidatePath("/admin"); }
  async function handleResetPw(fd: FormData) { "use server"; await resetUserPassword(fd); revalidatePath("/admin"); }
  async function handleAllowReset(fd: FormData) { "use server"; const id = fd.get("userId") as string; await allowPasswordReset(id); revalidatePath("/admin"); }
  async function handleCreateClient(fd: FormData) { "use server"; await createClientAccount(fd); revalidatePath("/admin"); }
  async function handleClientPerms(fd: FormData) { "use server"; await updateClientPermissions(fd); revalidatePath("/admin"); }
  async function handleClientResetPw(fd: FormData) { "use server"; await resetClientPassword(fd); revalidatePath("/admin"); }
  async function handleReplyMessage(fd: FormData) { "use server"; await replyToClientMessage(fd); revalidatePath("/admin"); }
  async function handleMarkRead(fd: FormData) { "use server"; const id = fd.get("id") as string; await markMessageRead(id); revalidatePath("/admin"); }
  async function handlePostUpdate(fd: FormData) { "use server"; await postProjectUpdate(fd); revalidatePath("/admin"); }
  async function handleDeleteUpdate(fd: FormData) { "use server"; const id = fd.get("id") as string; await deleteProjectUpdate(id); revalidatePath("/admin"); }
  const PAGE_PERMS = ["tasks", "projects", "notifications", "directory", "finance"];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-black">Z</span>
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 tracking-tight leading-none">ZYANIX <span className="text-blue-500">HQ</span></h1>
              <p className="text-xs text-gray-400 leading-none mt-0.5">Admin · {session.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
            </span>
            <span className="text-xs text-gray-400 font-mono">{today}</span>
            <form action={logoutAction}>
              <button className="text-xs text-gray-400 hover:text-gray-700 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
          <StatCard label="Total Projects" value={stats.total} color="text-gray-900" />
          <StatCard label="Active" value={stats.active} color="text-blue-600" />
          <StatCard label="Completed" value={stats.completed} color="text-emerald-600" />
          <StatCard label="Revenue" value={`$${revenue.income.toFixed(0)}`} sub="total income" color="text-gray-900" />
          <StatCard label="Net P&L" value={`$${revenue.net.toFixed(0)}`} sub="income − expenses" color={revenue.net >= 0 ? "text-emerald-600" : "text-red-500"} />
          <StatCard label="Team Members" value={(users as any[]).filter((u: any) => u.role === "member").length} sub={`${(users as any[]).length} total users`} color="text-gray-900" />
        </div>

        {/* Tab Layout */}
        <AdminTabs
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "clients", label: "Clients" },
            { id: "users", label: "Team & Access" },
            { id: "notifications", label: "Notifications" },
            { id: "messages", label: "Client Messages" },
            { id: "history", label: "History" },
          ]}
          defaultTab="overview"
        >
          {/* ══ OVERVIEW TAB ══ */}
          <div data-tab="overview" className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-1 space-y-6">
              <Card>
                <SectionHeader title="Add Contact" subtitle="Clients, team & partners" />
                <form action={handleRecord} className="space-y-3">
                  <Field label="Full Name" name="name" required placeholder="John Smith" />
                  <Field label="Email" name="email" type="email" required placeholder="john@example.com" />
                  <Field label="Phone" name="phone" placeholder="+1 555 000 0000" />
                  <Select label="Role" name="role">
                    <option value="client">Client</option>
                    <option value="team">Team Member</option>
                    <option value="partner">Partner</option>
                    <option value="founder">Founder</option>
                  </Select>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
                    <textarea name="notes" rows={2} placeholder="Additional info…" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50/50 resize-none" />
                  </div>
                  <Btn label="Add Contact" />
                </form>
              </Card>
              <Card>
                <SectionHeader title="New Project" subtitle="Create & assign to client" />
                <form action={handleProject} className="space-y-3">
                  <Select label="Client" name="clientId" required>
                    <option value="">— select client —</option>
                    {clients_dir.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                  <Field label="Project Title" name="title" required placeholder="Website Redesign" />
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                    <textarea name="description" rows={2} placeholder="Brief scope…" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50/50 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Priority" name="priority">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </Select>
                    <Field label="Budget ($)" name="budget" type="number" placeholder="5000" />
                  </div>
                  <Field label="Timeline (days)" name="deadlineDays" type="number" placeholder="7" />
                  <Btn label="Create Project" />
                </form>
              </Card>
              <Card>
                <SectionHeader title="Add Task" />
                <form action={handleTask} className="space-y-3">
                  <Select label="Project" name="projectId" required>
                    <option value="">— select project —</option>
                    {(projects as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </Select>
                  <Field label="Task Title" name="title" required placeholder="Design homepage mockup" />
                  <Field label="Assigned To" name="assignedTo" placeholder="Team member name" />
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Priority" name="priority">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </Select>
                    <Field label="Due Date" name="dueDate" type="date" />
                  </div>
                  <Btn label="Add Task" />
                </form>
              </Card>
            </div>

            <div className="xl:col-span-3 space-y-6">
              <Card>
                <SectionHeader title="Projects" subtitle="Click status to cycle · Click milestone to toggle payment" />
                {(projects as any[]).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No projects yet.</p>
                ) : (
                  <div className="space-y-4">
                    {(projects as any[]).map((p: any) => (
                      <div key={p.id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-all">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900 text-sm">{p.title}</h3>
                              {p.priority && <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityStyle[p.priority]}`}>{p.priority}</span>}
                              <ProjectStatusToggle project={p} />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{p.client_name}{p.budget ? ` · $${p.budget}` : ""} · Due <span className="font-mono text-gray-500">{p.delivery_deadline}</span></p>
                            {p.description && <p className="text-xs text-gray-500 mt-1">{p.description}</p>}
                          </div>
                        </div>
                        <MilestoneTracker project={p} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card>
                <SectionHeader title="Task Board" subtitle="Click status to cycle: To Do → In Progress → Done" />
                {(tasks as any[]).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No tasks yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {["Task","Project","Assigned","Priority","Due","Status"].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(tasks as any[]).map((t: any) => (
                          <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 pr-4 font-medium text-gray-800">{t.title}</td>
                            <td className="py-3 pr-4 text-gray-500 text-xs">{t.project_title || "—"}</td>
                            <td className="py-3 pr-4 text-gray-500 text-xs">{t.assigned_to || "—"}</td>
                            <td className="py-3 pr-4">{t.priority && <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityStyle[t.priority]}`}>{t.priority}</span>}</td>
                            <td className="py-3 pr-4 text-xs font-mono text-gray-400">{t.due_date || "—"}</td>
                            <td className="py-3"><TaskStatusToggle task={t} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <SectionHeader title="Finance Ledger" />
                  <form action={handleRevenue} className="space-y-3 mb-5 pb-5 border-b border-gray-100">
                    <Field label="Label" name="label" required placeholder="Client payment — Project X" />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Amount ($)" name="amount" type="number" required placeholder="2500" />
                      <Select label="Type" name="type" required><option value="income">Income</option><option value="expense">Expense</option></Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Date" name="date" type="date" required />
                      <Select label="Project (opt)" name="projectId">
                        <option value="">None</option>
                        {(projects as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
                      </Select>
                    </div>
                    <Btn label="Add Entry" />
                  </form>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {revenue.entries.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">No entries yet.</p> : revenue.entries.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between text-xs py-1.5">
                        <div className="flex-1 min-w-0"><p className="font-medium text-gray-700 truncate">{r.label}</p><p className="text-gray-400 font-mono">{r.date}</p></div>
                        <span className={`font-bold ml-3 ${r.type === "income" ? "text-emerald-600" : "text-red-500"}`}>{r.type === "income" ? "+" : "−"}${r.amount.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <SectionHeader title="Directory" />
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {(records as any[]).map((r: any) => (
                      <div key={r.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">{r.name.charAt(0).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2"><p className="text-sm font-semibold text-gray-800 truncate">{r.name}</p><span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${roleStyle[r.role] || roleStyle.client}`}>{r.role}</span></div>
                          <p className="text-xs text-gray-400 truncate">{r.email}</p>
                          {r.phone && <p className="text-xs text-gray-400">{r.phone}</p>}
                          {r.notes && <p className="text-xs text-gray-400 italic mt-0.5">{r.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <Card>
                <SectionHeader title="Founder Notes" />
                <form action={handleNote} className="flex gap-3 mb-5 pb-5 border-b border-gray-100">
                  <div className="flex-1 space-y-2">
                    <input type="text" name="title" required placeholder="Note title…" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50/50" />
                    <textarea name="content" required rows={2} placeholder="Write your note here…" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50/50 resize-none" />
                  </div>
                  <button type="submit" className="self-end bg-gray-900 hover:bg-gray-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm whitespace-nowrap">Save</button>
                </form>
                {(notes as any[]).length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No notes yet.</p> : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(notes as any[]).map((n: any) => (
                      <div key={n.id} className={`rounded-xl border p-4 ${n.pinned ? "border-amber-200 bg-amber-50/50" : "border-gray-100 bg-gray-50/50"}`}>
                        <div className="flex items-start justify-between gap-2 mb-2"><p className="text-sm font-semibold text-gray-800">{n.title}</p><NoteActions note={n} /></div>
                        <p className="text-xs text-gray-500 whitespace-pre-wrap">{n.content}</p>
                        <p className="text-xs text-gray-300 font-mono mt-2">{n.created_at?.split("T")[0]}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* ══ CLIENTS TAB ══ */}
          <div data-tab="clients" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Create client account */}
            <Card>
              <SectionHeader title="Create Client Account" subtitle="Auto-generates Z###@zyanix ID" />
              <form action={handleCreateClient} className="space-y-3">
                <Field label="Client Name" name="name" required placeholder="Acme Corp" />
                <Field label="Email" name="email" type="email" placeholder="client@example.com" />
                <Field label="Phone" name="phone" placeholder="+91 99999 00000" />
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Link to Existing Client</label>
                  <select name="directoryId"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50/50">
                    <option value="">— Create new directory entry —</option>
                    {clients_dir.filter((c: any) => !c.client_id).length === 0 && (records as any[]).filter((r: any) => r.role === "client").map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Portal Sections</label>
                  <div className="space-y-2">
                    {["overview","projects","payments","messages"].map(p => (
                      <label key={p} className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" name="perm_check" value={p} defaultChecked
                          className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                        <span className="text-sm text-gray-700 capitalize">{p}</span>
                      </label>
                    ))}
                  </div>
                  <input type="hidden" name="page_permissions" value="overview,projects,payments,messages" />
                </div>
                <Btn label="Create Client Portal" />
              </form>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs text-blue-700 font-semibold">Auto-generated credentials</p>
                <p className="text-xs text-blue-600 mt-0.5">Username: <code>Z###@zyanix</code> · Password = Username</p>
                <p className="text-xs text-blue-500 mt-0.5">Share these with the client. They can be reset below.</p>
              </div>
            </Card>

            {/* Client list */}
            <div className="xl:col-span-2 space-y-4">
              {/* Post project update */}
              <Card>
                <SectionHeader title="Post Project Update" subtitle="Visible to clients on their portal" />
                <form action={handlePostUpdate} className="space-y-3">
                  <Select label="Project" name="projectId" required>
                    <option value="">— select project —</option>
                    {(projects as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.title} ({p.client_name})</option>)}
                  </Select>
                  <Field label="Update Title" name="title" required placeholder="Design phase completed" />
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Content</label>
                    <textarea name="content" required rows={3} placeholder="Describe the update…"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50/50 resize-none" />
                  </div>
                  <input type="hidden" name="visibleToClient" value="1" />
                  <Btn label="Post Update" />
                </form>
              </Card>

              {/* Client accounts */}
              <Card>
                <SectionHeader title="Client Accounts" subtitle={`${(clients as any[]).length} clients · Click ID to copy`} />
                {(clients as any[]).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No client accounts yet.</p>
                ) : (
                  <div className="space-y-4">
                    {(clients as any[]).map((c: any) => (
                      <div key={c.id} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-black text-blue-600">{c.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{c.name}</p>
                              <p className="text-xs font-mono text-blue-600 font-semibold">{c.username}</p>
                              {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${c.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                            {c.active ? "Active" : "Disabled"}
                          </span>
                          {c.must_change_password === 1 && (
                            <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-amber-50 text-amber-700 border-amber-200">⏳ Awaiting pw set</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mb-3">Portal access: <span className="font-medium text-gray-600">{c.page_permissions || "none"}</span></p>
                        <form action={handleClientPerms} className="space-y-2 mb-3">
                          <input type="hidden" name="userId" value={c.id} />
                          <div className="flex flex-wrap gap-2">
                            {["overview","projects","payments","messages"].map(p => {
                              const has = (c.page_permissions || "").split(",").map((x: string) => x.trim()).includes(p);
                              return (
                                <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="checkbox" name="perm" value={p} defaultChecked={has} className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" />
                                  <span className="text-xs text-gray-700 capitalize">{p}</span>
                                </label>
                              );
                            })}
                          </div>
                          <div className="flex gap-2">
                            <Select label="" name="active">
                              <option value="1">Active</option>
                              <option value="0">Disabled</option>
                            </Select>
                            <input type="hidden" name="permissions" />
                            <button type="submit" className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors self-end">Save</button>
                          </div>
                        </form>
                        <div className="flex items-center gap-2 flex-wrap">
                          <form action={handleClientResetPw} className="flex gap-2 flex-1 min-w-0">
                            <input type="hidden" name="userId" value={c.id} />
                            <input type="password" name="newPassword" required placeholder="Set temp password…"
                              className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-300 focus:outline-none focus:border-blue-400 bg-gray-50/50" />
                            <button type="submit" title="Set a temp password — client must change on next login"
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                              Set Temp PW
                            </button>
                          </form>
                          {c.must_change_password !== 1 && (
                            <form action={handleAllowReset}>
                              <input type="hidden" name="userId" value={c.id} />
                              <button type="submit" title="Allow client to set a new password on next login"
                                className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                                Allow Reset
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Project updates list */}
              {(projectUpdates as any[]).length > 0 && (
                <Card>
                  <SectionHeader title="Posted Updates" subtitle="Updates visible to clients" />
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {(projectUpdates as any[]).map((u: any) => (
                      <div key={u.id} className="flex items-start justify-between gap-3 p-3 border border-gray-100 rounded-xl">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{u.title}</p>
                          <p className="text-xs text-gray-400">{u.project_title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{u.content}</p>
                        </div>
                        <form action={handleDeleteUpdate}>
                          <input type="hidden" name="id" value={u.id} />
                          <button type="submit" className="text-gray-300 hover:text-red-400 text-xs transition-colors shrink-0">✕</button>
                        </form>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* ══ CLIENT MESSAGES TAB ══ */}
          <div data-tab="messages" className="space-y-4">
            <Card>
              <SectionHeader title="Client Messages" subtitle="Messages sent directly to you by clients" />
              {(clientMessages as any[]).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No messages yet.</p>
              ) : (
                <div className="space-y-4">
                  {(clientMessages as any[]).map((m: any) => (
                    <div key={m.id} className={`border rounded-xl overflow-hidden ${m.read ? "border-gray-100" : "border-blue-200"}`}>
                      <div className={`px-4 py-3 flex items-start justify-between gap-3 ${m.read ? "bg-gray-50" : "bg-blue-50"}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900">{m.client_name}</p>
                            {!m.read && <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">New</span>}
                            {m.replied && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Replied</span>}
                          </div>
                          <p className="text-sm font-semibold text-gray-700 mt-0.5">{m.subject}</p>
                          <p className="text-xs text-gray-400 font-mono">{m.created_at?.replace("T"," ").split(".")[0]}</p>
                        </div>
                        {!m.read && (
                          <form action={handleMarkRead}>
                            <input type="hidden" name="id" value={m.id} />
                            <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0">Mark read</button>
                          </form>
                        )}
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-sm text-gray-700">{m.message}</p>
                        {m.admin_reply && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs font-semibold text-emerald-600 mb-1">Your reply:</p>
                            <p className="text-sm text-gray-600">{m.admin_reply}</p>
                          </div>
                        )}
                        {!m.replied && (
                          <form action={handleReplyMessage} className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                            <input type="hidden" name="messageId" value={m.id} />
                            <textarea name="reply" required rows={2} placeholder="Type your reply…"
                              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50/50 resize-none" />
                            <button type="submit" className="shrink-0 bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors self-end">Reply</button>
                          </form>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ══ USERS & ACCESS TAB ══ */}          <div data-tab="users" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card>
              <SectionHeader title="Create Account" subtitle="Only you can create accounts" />
              <form action={handleCreateUser} className="space-y-3">
                <Field label="Full Name" name="name" required placeholder="Alex Johnson" />
                <Field label="Username" name="username" required placeholder="alex.johnson" />
                <Field label="Password" name="password" type="password" required placeholder="••••••••" />
                <Select label="Role" name="role">
                  <option value="member">Team Member</option>
                  <option value="admin">Admin</option>
                </Select>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Page Permissions</label>
                  <div className="space-y-2">
                    {PAGE_PERMS.map(p => (
                      <label key={p} className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" name="perm" value={p} defaultChecked={p === "tasks" || p === "notifications"}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700 capitalize">{p}</span>
                      </label>
                    ))}
                  </div>
                  <input type="hidden" name="permissions" id="perms-hidden" />
                </div>
                <Btn label="Create Account" />
              </form>
            </Card>
            <div className="xl:col-span-2 space-y-4">
              <Card>
                <SectionHeader title="Team Members" subtitle="Manage access & permissions" />
                {(users as any[]).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No team members yet.</p>
                ) : (
                  <div className="space-y-4">
                    {(users as any[]).map((u: any) => (
                      <div key={u.id} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">{u.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleStyle[u.role] || roleStyle.member}`}>{u.role}</span>
                                {!u.active && <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-red-50 text-red-600 border-red-200">Disabled</span>}
                                {u.must_change_password === 1 && <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-amber-50 text-amber-700 border-amber-200">⏳ Awaiting pw set</span>}
                              </div>
                              <p className="text-xs text-gray-400">@{u.username}</p>
                            </div>
                          </div>
                        </div>
                        <form action={handlePermissions} className="space-y-3">
                          <input type="hidden" name="userId" value={u.id} />
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Page Access</p>
                            <div className="flex flex-wrap gap-2">
                              {PAGE_PERMS.map(p => {
                                const hasIt = (u.page_permissions || "").split(",").map((x: string) => x.trim()).includes(p);
                                return (
                                  <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" name="perm" value={p} defaultChecked={hasIt}
                                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    <span className="text-xs text-gray-700 capitalize">{p}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <input type="hidden" name="permissions" />
                          </div>
                          <div className="flex items-center gap-3">
                            <Select label="" name="active">
                              <option value="1">Active</option>
                              <option value="0">Disabled</option>
                            </Select>
                            <button type="submit" className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">Save</button>
                          </div>
                        </form>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
                          <form action={handleResetPw} className="flex gap-2 flex-1 min-w-0">
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="password" name="newPassword" required placeholder="Set temp password…"
                              className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-300 focus:outline-none focus:border-blue-400 bg-gray-50/50" />
                            <button type="submit" title="Set a temp password — user must change it on next login"
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                              Set Temp PW
                            </button>
                          </form>
                          {u.must_change_password !== 1 && (
                            <form action={handleAllowReset}>
                              <input type="hidden" name="userId" value={u.id} />
                              <button type="submit" title="Allow user to set a new password on next login"
                                className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                                Allow Reset
                              </button>
                            </form>
                          )}
                          {u.role !== "admin" && (
                            <DeleteUserButton userId={u.id} name={u.name} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* ══ NOTIFICATIONS TAB ══ */}
          <div data-tab="notifications" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card>
              <SectionHeader title="Send Notification" subtitle="Send personal or broadcast messages" />
              <form action={handleNotification} className="space-y-3">
                <Select label="Send To" name="userId">
                  <option value="all">📢 All Team Members</option>
                  {(users as any[]).filter((u: any) => u.role === "member").map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                  ))}
                </Select>
                <Field label="Title" name="title" required placeholder="Project update" />
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Message</label>
                  <textarea name="message" required rows={4} placeholder="Write your message here…"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50/50 resize-none" />
                </div>
                <Btn label="Send Notification" />
              </form>
            </Card>
            <div className="xl:col-span-2">
              <Card>
                <SectionHeader title="Sent Notifications" subtitle="All messages sent to team" />
                {(notifications as any[]).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No notifications sent yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {(notifications as any[]).map((n: any) => (
                      <div key={n.id} className={`flex gap-3 p-4 rounded-xl border ${n.read ? "border-gray-100 bg-gray-50/30" : "border-blue-100 bg-blue-50/30"}`}>
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? "bg-gray-300" : "bg-blue-500"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                            <span className="text-xs text-gray-400 shrink-0">→ {n.user_name}</span>
                          </div>
                          <p className="text-sm text-gray-500">{n.message}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-gray-300 font-mono">{n.created_at?.replace("T"," ").split(".")[0]}</p>
                            <span className={`text-xs font-medium ${n.read ? "text-gray-400" : "text-blue-500"}`}>{n.read ? "Read ✓" : "Unread"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* ══ HISTORY TAB ══ */}
          <div data-tab="history">
            <Card>
              <SectionHeader title="Activity History" subtitle="Full audit log of all actions" />
              {(logs as any[]).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No activity recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Time","Actor","Action","Target","Detail"].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(logs as any[]).map((l: any) => (
                        <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-2.5 pr-4 text-xs font-mono text-gray-400 whitespace-nowrap">{l.created_at?.replace("T"," ").split(".")[0]}</td>
                          <td className="py-2.5 pr-4 text-sm font-medium text-gray-800">{l.actor}</td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                              l.action === "login" ? "bg-green-50 text-green-700 border-green-200" :
                              l.action.startsWith("delete") ? "bg-red-50 text-red-600 border-red-200" :
                              l.action.startsWith("create") ? "bg-blue-50 text-blue-700 border-blue-200" :
                              l.action === "send_notification" ? "bg-purple-50 text-purple-700 border-purple-200" :
                              "bg-gray-50 text-gray-600 border-gray-200"
                            }`}>{l.action.replace(/_/g," ")}</span>
                          </td>
                          <td className="py-2.5 pr-4 text-xs text-gray-500 font-mono">{l.target || "—"}</td>
                          <td className="py-2.5 text-xs text-gray-500 max-w-xs truncate">{l.detail || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

        </AdminTabs>
      </div>

      <footer className="border-t border-gray-100 bg-white mt-12">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">ZYANIX HQ — Founder Operations Platform</p>
          <p className="text-xs text-gray-300">Cloudflare D1 · Next.js 16 Edge</p>
        </div>
      </footer>
    </div>
  );
}
