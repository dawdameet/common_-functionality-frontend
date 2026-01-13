"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { LoginScreen } from "./LoginScreen";
import { Loader2 } from "lucide-react";
import { Session, AuthChangeEvent } from "@supabase/supabase-js";

export type UserRole = "moderator" | "general";

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
}

interface UserContextType {
    currentUser: User;
    logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchUser = async (session: Session | null) => {
            if (!session?.user) {
                setCurrentUser(null);
                setIsLoading(false);
                return;
            }

            try {
                // Fetch profile
                let { data: profile, error } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", session.user.id)
                    .single();

                if (error || !profile) {
                    // Retry once after a short delay (handling trigger race condition)
                    await new Promise(r => setTimeout(r, 1000));
                    const retry = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", session.user.id)
                        .single();
                    profile = retry.data;
                }

                if (profile) {
                    setCurrentUser({
                        id: profile.id,
                        name: profile.full_name || session.user.email?.split("@")[0] || "User",
                        email: session.user.email || "",
                        role: (profile.role as UserRole) || "general",
                        avatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`,
                    });
                }
            } catch (e) {
                console.error("Error fetching user profile:", e);
            } finally {
                setIsLoading(false);
            }
        };

        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            fetchUser(session);
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            fetchUser(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (!currentUser) {
        return <LoginScreen />;
    }

    return (
        <UserContext.Provider value={{ currentUser, logout }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}
