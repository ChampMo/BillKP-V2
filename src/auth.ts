import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * อีเมลที่อนุญาตให้เข้าใช้งาน — คั่นด้วยจุลภาคใน env `ALLOWED_EMAILS`
 * ถ้าไม่ตั้งค่าไว้ จะไม่ให้ใครเข้าเลย (fail closed) เพราะนี่คือระบบออกบิลของบริษัท
 * ปลอดภัยกว่าการเผลอเปิดให้ทุกคนที่มีบัญชี Google เข้าได้
 */
function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email) return false;
      return allowedEmails().includes(email);
    },
    session({ session }) {
      return session;
    },
  },
  session: { strategy: "jwt" },
  trustHost: true,
});
