import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

const isProduction = process.env.NODE_ENV === "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // REMOVED PrismaAdapter: Not needed for Credentials/JWT and prevents extra DB connection timeouts
  session: {
    strategy: "jwt",
    maxAge: 60 * 60,
  },
  jwt: {
    maxAge: 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Wrap in try...catch so we can see if InterServer is blocking us
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string }
          });

          if (!user || !user.password) {
            console.log("Auth: User not found in database.");
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isPasswordValid) {
            console.log("Auth: Password mismatch.");
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          };
        } catch (error: any) {
          // THIS WILL NOW PRINT THE REAL INTERSERVER CONNECTION ERROR TO YOUR TERMINAL
          console.error("DATABASE CONNECTION ERROR IN AUTHORIZE:", error.message);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
});