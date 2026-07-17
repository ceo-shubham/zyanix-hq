import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import SetPasswordForm from "@/components/SetPasswordForm";

export const runtime = "edge";

export default async function SetPasswordPage() {
  const session = await getSession();
  if (!session || !session.mustChangePassword) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-xl font-black">Z</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            ZYANIX <span className="text-blue-500">HQ</span>
          </h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {/* Security banner */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <span className="text-amber-500 text-lg shrink-0">🔐</span>
            <div>
              <p className="text-sm font-bold text-amber-800">Set your personal password</p>
              <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                Welcome, <strong>{session.name}</strong>. For your security, please set a new private password before continuing.
                Your admin will not be able to see it.
              </p>
            </div>
          </div>

          <SetPasswordForm />
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          This is a one-time step to secure your account
        </p>
      </div>
    </div>
  );
}
