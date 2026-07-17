import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getClientPortalData } from "@/app/actions/clients";
import { sendClientMessage } from "@/app/actions/messages";
import { logoutAction } from "@/app/actions/auth";
import ClientTabs from "@/components/ClientTabs";
import { revalidatePath } from "next/cache";

export const runtime = "edge";

const milestoneConfig = [
  { key: "m1_deposit_30", label: "30% Deposit", pct: 30 },
  { key: "m2_development_30", label: "30% Development", pct: 30 },
  { key: "m3_delivery_40", label: "40% Final Delivery", pct: 40 },
];

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${color}`}>{label}</span>;
}

export default async function ClientPortal() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "admin") redirect("/admin");
  if (session.role !== "client") redirect("/dashboard");

  const data = await getClientPortalData(session.userId);
  if (!data) redirect("/login");

  const { user, projects, updates, payments, tasks, messages } = data;
  const perms: string[] = (user.page_permissions || "").split(",").map((p: string) => p.trim());

  const totalBudget = projects.reduce((s: number, p: any) => s + (parseFloat(p.budget) || 0), 0);
  const totalPaid = payments.reduce((s: number, r: any) => s + (r.amount || 0), 0);
  const totalDue = totalBudget - totalPaid;
  const unreadMessages = (messages as any[]).filter((m: any) => m.admin_reply && !m.read).length;

  async function handleMessage(fd: FormData) {
    "use server";
    fd.set("clientUserId", session!.userId);
    fd.set("clientName", session!.name);
    await sendClientMessage(fd);
    revalidatePath("/client");
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-black">Z</span>
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 tracking-tight leading-none">ZYANIX <span className="text-blue-500">HQ</span></h1>
              <p className="text-xs text-gray-400 leading-none mt-0.5">Client Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {unreadMessages > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-500 px-2.5 py-1 rounded-full">
                {unreadMessages} reply
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-800">{session.name}</p>
                <p className="text-xs text-gray-400 font-mono">{session.username}</p>
              </div>
            </div>
            <form action={logoutAction}>
              <button className="text-xs text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome + ID card */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-gray-400 text-sm mb-1">Welcome back</p>
              <h2 className="text-2xl font-black">{session.name}</h2>
              <p className="text-gray-400 text-sm mt-1">Client ID: <span className="font-mono text-blue-400 font-semibold">{session.username}</span></p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-1">Your Projects</div>
              <div className="text-3xl font-black">{projects.length}</div>
            </div>
          </div>
          {totalBudget > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700">
              <div>
                <p className="text-xs text-gray-400">Total Budget</p>
                <p className="text-lg font-bold">${totalBudget.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Paid</p>
                <p className="text-lg font-bold text-emerald-400">${totalPaid.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Due</p>
                <p className="text-lg font-bold text-amber-400">${totalDue > 0 ? totalDue.toFixed(0) : "0"}</p>
              </div>
            </div>
          )}
        </div>

        <ClientTabs
          tabs={[
            ...(perms.includes("overview") ? [{ id: "overview", label: "Overview" }] : []),
            ...(perms.includes("projects") ? [{ id: "projects", label: "My Projects" }] : []),
            ...(perms.includes("payments") ? [{ id: "payments", label: "Payments" }] : []),
            ...(perms.includes("messages") ? [{ id: "messages", label: "Messages" }] : []),
          ]}
          defaultTab={perms[0] || "overview"}
        >
          {/* OVERVIEW */}
          {perms.includes("overview") && (
            <div data-tab="overview" className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Your Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Name</p>
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Client ID</p>
                    <p className="text-sm font-semibold text-blue-600 font-mono">{session.username}</p>
                  </div>
                  {user.email && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Email</p>
                      <p className="text-sm font-semibold text-gray-900">{user.email}</p>
                    </div>
                  )}
                  {user.phone && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                      <p className="text-sm font-semibold text-gray-900">{user.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Latest Updates */}
              {updates.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Latest Updates</h2>
                  <div className="space-y-3">
                    {(updates as any[]).slice(0, 5).map((u: any) => (
                      <div key={u.id} className="flex gap-3 p-4 border border-gray-100 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{u.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{u.project_title}</p>
                          <p className="text-sm text-gray-600 mt-1">{u.content}</p>
                          <p className="text-xs text-gray-300 font-mono mt-1">{u.created_at?.replace("T"," ").split(".")[0]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Need Help?</h2>
                <p className="text-sm text-gray-500 mb-4">Reach out to us directly anytime.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="tel:+918395897002"
                    className="flex items-center gap-2.5 bg-gray-900 hover:bg-gray-700 text-white px-4 py-3 rounded-xl text-sm font-semibold transition-colors">
                    <span>📞</span> +91 83958 97002
                  </a>
                  <a href="https://wa.me/918395897002" target="_blank" rel="noreferrer"
                    className="flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl text-sm font-semibold transition-colors">
                    <span>💬</span> WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* PROJECTS */}
          {perms.includes("projects") && (
            <div data-tab="projects" className="space-y-4">
              {projects.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="font-semibold text-gray-800">No projects yet</p>
                  <p className="text-sm text-gray-400 mt-1">Your projects will appear here once assigned.</p>
                </div>
              ) : (
                (projects as any[]).map((p: any) => {
                  const projectPaid = payments.filter((r: any) => r.project_id === p.id).reduce((s: number, r: any) => s + r.amount, 0);
                  const budget = parseFloat(p.budget) || 0;
                  const paidPct = budget > 0 ? Math.round((projectPaid / budget) * 100) : 0;
                  const projectUpdates = updates.filter((u: any) => u.project_id === p.id);
                  const projectTasks = tasks.filter((t: any) => t.project_id === p.id);
                  const doneTasks = projectTasks.filter((t: any) => t.status === "done").length;

                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{p.title}</h3>
                          {p.description && <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>}
                        </div>
                        <Badge label={p.status} color={
                          p.status === "active" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          p.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                        } />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400">Deadline</p>
                          <p className="text-sm font-bold text-gray-800 font-mono">{p.delivery_deadline}</p>
                        </div>
                        {budget > 0 && (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-400">Budget</p>
                            <p className="text-sm font-bold text-gray-800">${budget.toFixed(0)}</p>
                          </div>
                        )}
                        {projectTasks.length > 0 && (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-400">Progress</p>
                            <p className="text-sm font-bold text-gray-800">{doneTasks}/{projectTasks.length} tasks</p>
                          </div>
                        )}
                      </div>

                      {/* Milestones */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Milestones</p>
                        <div className="flex flex-wrap gap-2">
                          {milestoneConfig.map(m => {
                            const paid = p[m.key] === "paid";
                            return (
                              <div key={m.key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${paid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${paid ? "bg-emerald-500" : "bg-gray-300"}`} />
                                {m.label} — {paid ? "✓ Paid" : "Pending"}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Payment progress bar */}
                      {budget > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Paid: ${projectPaid.toFixed(0)}</span>
                            <span>{paidPct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${paidPct}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Project Updates */}
                      {projectUpdates.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Updates</p>
                          <div className="space-y-2">
                            {projectUpdates.map((u: any) => (
                              <div key={u.id} className="bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                                <p className="text-sm font-semibold text-gray-800">{u.title}</p>
                                <p className="text-sm text-gray-600 mt-0.5">{u.content}</p>
                                <p className="text-xs text-gray-300 font-mono mt-1">{u.created_at?.replace("T"," ").split(".")[0]}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* PAYMENTS */}
          {perms.includes("payments") && (
            <div data-tab="payments">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Payment History</h2>
                <p className="text-sm text-gray-400 mb-6">All payments recorded for your projects</p>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Total Budget</p>
                    <p className="text-xl font-black text-gray-900">${totalBudget.toFixed(0)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-emerald-600 mb-1">Total Paid</p>
                    <p className="text-xl font-black text-emerald-700">${totalPaid.toFixed(0)}</p>
                  </div>
                  <div className={`rounded-xl p-4 text-center ${totalDue > 0 ? "bg-amber-50" : "bg-emerald-50"}`}>
                    <p className={`text-xs mb-1 ${totalDue > 0 ? "text-amber-600" : "text-emerald-600"}`}>Remaining</p>
                    <p className={`text-xl font-black ${totalDue > 0 ? "text-amber-700" : "text-emerald-700"}`}>${totalDue > 0 ? totalDue.toFixed(0) : "0"}</p>
                  </div>
                </div>

                {payments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No payments recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(payments as any[]).map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{r.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-gray-400 font-mono">{r.date}</p>
                            <span className="text-xs text-gray-400">·</span>
                            <p className="text-xs text-gray-400">{r.project_title}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-emerald-600">+${r.amount.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {perms.includes("messages") && (
            <div data-tab="messages" className="space-y-6">
              {/* Send message form */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Send a Message</h2>
                <p className="text-sm text-gray-400 mb-5">Send a message directly to the founder. Only they can see your messages.</p>
                <form action={handleMessage} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Subject</label>
                    <input type="text" name="subject" required placeholder="e.g. Question about my project"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Message</label>
                    <textarea name="message" required rows={4} placeholder="Write your message here…"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50/50 resize-none" />
                  </div>
                  <button type="submit" className="bg-gray-900 hover:bg-gray-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all duration-200">
                    Send Message
                  </button>
                </form>
              </div>

              {/* Message history */}
              {messages.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-5">Message History</h2>
                  <div className="space-y-4">
                    {(messages as any[]).map((m: any) => (
                      <div key={m.id} className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{m.subject}</p>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{m.created_at?.replace("T"," ").split(".")[0]}</p>
                          </div>
                          {m.replied ? (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">Replied</span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">Pending</span>
                          )}
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-sm text-gray-700">{m.message}</p>
                          {m.admin_reply && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs font-semibold text-blue-600 mb-1">Reply from Zyanix:</p>
                              <p className="text-sm text-gray-800">{m.admin_reply}</p>
                              <p className="text-xs text-gray-300 font-mono mt-1">{m.replied_at?.replace("T"," ").split(".")[0]}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact options */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-1">Other Ways to Reach Us</h2>
                <p className="text-sm text-gray-400 mb-4">For urgent queries, call or WhatsApp directly.</p>
                <div className="flex flex-wrap gap-3">
                  <a href="tel:+918395897002" className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                    📞 +91 83958 97002
                  </a>
                  <a href="https://wa.me/918395897002" target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                    💬 WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )}
        </ClientTabs>
      </div>

      <footer className="border-t border-gray-100 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-gray-400">ZYANIX HQ — Client Portal</p>
          <p className="text-xs text-gray-300">Your data is private and secure</p>
        </div>
      </footer>
    </div>
  );
}
