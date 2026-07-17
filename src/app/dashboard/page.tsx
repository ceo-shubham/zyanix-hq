import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getNotificationsForUser, markNotificationRead } from "@/app/actions/notifications";
import { getAllTasks } from "@/app/actions/tasks";
import { getActiveProjects } from "@/app/actions/projects";
import { logoutAction } from "@/app/actions/auth";
import NotificationReadButton from "@/components/NotificationReadButton";
import { revalidatePath } from "next/cache";

export const runtime = "edge";

const PAGE_LABELS: Record<string, string> = {
  tasks: "My Tasks",
  projects: "Projects",
  notifications: "Notifications",
  directory: "Directory",
  finance: "Finance",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "admin") redirect("/admin");

  const permissions = session.permissions || [];

  const [notifications, tasks, projects] = await Promise.all([
    getNotificationsForUser(session.userId),
    permissions.includes("tasks") ? getAllTasks() : Promise.resolve([]),
    permissions.includes("projects") ? getActiveProjects() : Promise.resolve([]),
  ]);

  const myTasks = (tasks as any[]).filter(
    (t) =>
      t.assigned_to?.toLowerCase() === session.name?.toLowerCase() ||
      t.assigned_to?.toLowerCase() === session.username?.toLowerCase()
  );

  const unreadCount = (notifications as any[]).filter((n) => !n.read).length;

  async function handleMarkRead(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await markNotificationRead(id);
    revalidatePath("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-black">Z</span>
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 tracking-tight leading-none">
                ZYANIX <span className="text-blue-500">HQ</span>
              </h1>
              <p className="text-xs text-gray-400 leading-none mt-0.5">Team Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {unreadCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-white bg-red-500 px-2.5 py-1 rounded-full">
                {unreadCount} new
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">{session.name}</span>
            </div>
            <form action={logoutAction}>
              <button className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Access notice */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-blue-500 text-lg">👋</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">Welcome back, {session.name}!</p>
            <p className="text-xs text-blue-500">
              You have access to:{" "}
              {permissions.length > 0
                ? permissions.map((p) => PAGE_LABELS[p] || p).join(", ")
                : "No sections assigned yet"}
            </p>
          </div>
        </div>

        {/* Notifications */}
        {permissions.includes("notifications") && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
                <p className="text-sm text-gray-400 mt-0.5">Messages from your admin</p>
              </div>
              {unreadCount > 0 && (
                <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {(notifications as any[]).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No notifications yet.</p>
            ) : (
              <div className="space-y-3">
                {(notifications as any[]).map((n: any) => (
                  <div
                    key={n.id}
                    className={`flex gap-4 p-4 rounded-xl border transition-all ${
                      n.read
                        ? "border-gray-100 bg-gray-50/50"
                        : "border-blue-100 bg-blue-50/50"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? "bg-gray-300" : "bg-blue-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${n.read ? "text-gray-600" : "text-gray-900"}`}>
                        {n.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-300 font-mono mt-1">
                        {n.created_at?.replace("T", " ").split(".")[0]}
                      </p>
                    </div>
                    {!n.read && (
                      <form action={handleMarkRead}>
                        <input type="hidden" name="id" value={n.id} />
                        <button
                          type="submit"
                          className="text-xs text-blue-500 hover:text-blue-700 font-medium whitespace-nowrap transition-colors"
                        >
                          Mark read
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Tasks */}
        {permissions.includes("tasks") && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900">My Tasks</h2>
              <p className="text-sm text-gray-400 mt-0.5">Tasks assigned to you</p>
            </div>
            {myTasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No tasks assigned to you yet.</p>
            ) : (
              <div className="space-y-3">
                {myTasks.map((t: any) => (
                  <div key={t.id} className="flex items-start gap-3 p-3.5 border border-gray-100 rounded-xl hover:border-gray-200 transition-all">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      t.status === "done" ? "bg-emerald-400" :
                      t.status === "in-progress" ? "bg-amber-400" : "bg-gray-300"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${t.status === "done" ? "text-gray-400 line-through" : "text-gray-800"}`}>
                        {t.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">{t.project_title || "No project"}</span>
                        {t.due_date && (
                          <span className="text-xs font-mono text-gray-400">Due {t.due_date}</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${
                      t.status === "done" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      t.status === "in-progress" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-gray-100 text-gray-600 border-gray-200"
                    }`}>
                      {t.status === "in-progress" ? "In Progress" : t.status === "done" ? "Done" : "To Do"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Projects (read-only) */}
        {permissions.includes("projects") && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900">Projects</h2>
              <p className="text-sm text-gray-400 mt-0.5">Active project overview</p>
            </div>
            {(projects as any[]).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No active projects.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(projects as any[]).map((p: any) => (
                  <div key={p.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-gray-800">{p.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${
                        p.status === "active" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        p.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{p.client_name} · Due {p.delivery_deadline}</p>
                    {p.description && <p className="text-xs text-gray-500 mt-1">{p.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No permissions */}
        {permissions.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-gray-800 font-semibold">No sections enabled</p>
            <p className="text-sm text-gray-400 mt-1">Your admin hasn&apos;t granted you access to any sections yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
