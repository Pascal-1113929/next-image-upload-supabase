"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useAuthModal } from "@/hooks/useAuthModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
    const router = useRouter();
    const { user } = useUser();
    const authModal = useAuthModal();

    useEffect(() => {
        if (user) {
            router.push("/photos");
        }
    }, [user, router]);

    const handleLogin = () => {
        authModal.onOpen();
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center py-8 px-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <span className="text-6xl">🚂</span>
                    </div>
                    <CardTitle className="text-2xl text-center">
                        Welcome to TrainSpotter
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-center text-zinc-600 dark:text-zinc-400">
                        Sign in to upload and manage your train photos
                    </p>
                    <Button onClick={handleLogin} className="w-full" size="lg">
                        Sign In / Sign Up
                    </Button>
                    <div className="text-center">
                        <Button
                            variant="link"
                            onClick={() => router.push("/photos")}
                            className="text-sm"
                        >
                            Browse photos without signing in
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
