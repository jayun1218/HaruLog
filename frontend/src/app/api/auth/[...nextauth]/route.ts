import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchBackendToken(email: string, name?: string | null, picture?: string | null, provider?: string): Promise<string | null> {
    try {
        const res = await fetch(`${API}/api/auth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name, picture, provider: provider || "google" }),
        });
        if (res.ok) {
            const data = await res.json();
            return data.token;
        }
        console.error("Backend token issue failed:", res.status, await res.text());
    } catch (e) {
        console.error("Backend token request failed:", e);
    }
    return null;
}

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    callbacks: {
        async jwt({ token, account, user }: any) {
            // 최초 로그인이거나, backendToken이 아직 없는 경우 발급받기
            if ((account && user) || !token.backendToken) {
                const email = token.email || user?.email;
                if (email) {
                    const backendToken = await fetchBackendToken(
                        email,
                        token.name || user?.name,
                        token.picture || user?.image,
                        account?.provider || "google"
                    );
                    if (backendToken) {
                        token.backendToken = backendToken;
                    }
                }
                if (account) {
                    token.provider = account.provider;
                }
            }
            return token;
        },
        async session({ session, token }: any) {
            (session as any).backendToken = token.backendToken;
            session.user.id = token.sub;
            session.provider = token.provider;
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: "jwt",
    },
});

export { handler as GET, handler as POST };
