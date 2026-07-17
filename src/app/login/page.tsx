import LoginForm from "@/components/LoginForm";

export const runtime = "edge";

export default function LoginPage() {
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
          <p className="text-sm text-gray-400 mt-1">Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          Contact your admin for access
        </p>
      </div>
    </div>
  );
}
