import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthRedirectClient from "./AuthRedirectClient";

export default async function AppRedirectPage() {
    const cookieStore = await cookies();

    const prodCookie = cookieStore.get("__Secure-next-auth.session-token");
    const devCookie = cookieStore.get("next-auth.session-token");

    const sessionToken = prodCookie?.value || devCookie?.value;

    if (!sessionToken) {
        // 세션이 없으면 다시 로그인 페이지로
        redirect("/login?error=SessionMissing");
    }

    return (
        <AuthRedirectClient sessionToken={sessionToken} />
    );
}
