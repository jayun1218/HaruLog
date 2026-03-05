export { default } from "next-auth/middleware";

export const config = {
    matcher: [
        "/diary/write/:path*",
        "/diary/list/:path*",
        "/diary/gallery/:path*",
        "/statistics/:path*",
        "/report/:path*",
    ],
};
