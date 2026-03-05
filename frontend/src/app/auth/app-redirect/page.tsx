import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppRedirectPage() {
    const cookieStore = await cookies();

    const prodCookie = cookieStore.get("__Secure-next-auth.session-token");
    const devCookie = cookieStore.get("next-auth.session-token");

    const sessionToken = prodCookie?.value || devCookie?.value;

    if (!sessionToken) {
        // 세션이 없으면 다시 로그인 페이지로
        redirect("/login?error=SessionMissing");
    }

    // iOS 딥링크로 전달 (Info.plist에 등록된 harulog 스킴 사용)
    // 딥링크는 앱 내부에서만 처리되므로 네트워크 상에 노출되지 않음
    redirect(`harulog://auth-sync?token=${sessionToken}`);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <p className="text-lg font-bold text-slate-600 mb-2">앱으로 돌아가고 있어요...</p>
                <p className="text-sm text-slate-400">잠시만 기다려주세요. ✨</p>
                <a
                    href={`harulog://auth-sync?token=${sessionToken}`}
                    className="mt-4 inline-block px-6 py-3 bg-haru-sky-accent text-haru-sky-deep rounded-2xl font-black"
                >
                    앱이 열리지 않으면 여기를 누르세요
                </a>
            </div>
        </div>
    );
}
