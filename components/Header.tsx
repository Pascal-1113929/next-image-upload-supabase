"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useAuthModal } from "@/hooks/useAuthModal";
import { usePhotoUploadModal } from "@/hooks/usePhotoUploadModal";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { supabaseClient } from "@/lib/supabase";

export default function Header() {
    const router = useRouter();
    const { user } = useUser();
    const authModal = useAuthModal();
    const photoUploadModal = usePhotoUploadModal();

    const handleLogout = async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Logged out successfully");
            router.refresh();
        }
    };

    return (
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => router.push("/")}
                    >
                        <span className="text-2xl">🚂</span>
                        <h1 className="text-xl font-bold text-black dark:text-white">
                            TrainSpotter
                        </h1>
                    </div>

                    <nav className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => router.push("/photos")}
                        >
                            Gallery
                        </Button>

                        {user ? (
                            <>
                                <Button
                                    variant="default"
                                    onClick={() => photoUploadModal.onOpen()}
                                >
                                    Upload Photo
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => router.push("/my-photos")}
                                >
                                    My Photos
                                </Button>
                                <Button variant="outline" onClick={handleLogout}>
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => authModal.onOpen()}>
                                Login
                            </Button>
                        )}
                    </nav>
                </div>
            </div>
        </header>
    );
}
