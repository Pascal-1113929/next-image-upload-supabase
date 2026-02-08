"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

import Modal from "../Modal";
import { useRouter } from "next/navigation";
import { useAuthModal } from "@/hooks/useAuthModal";
import { useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { supabaseClient } from "@/lib/supabase";

const AuthModal = () => {
    const router = useRouter();
    const { user } = useUser();
    const {
        isOpen,
        onClose,
    } = useAuthModal();

    useEffect(() => {
        if (user) {
            router.refresh();
            onClose();
        }
    }, [user, router, onClose]);

    const onChange = (open: boolean) => {
        if (!open) {
            onClose();
        }
    }

    return (
        <Modal
            title="Welcome Back"
            description="Login into app"
            isOpen={isOpen}
            onChange={onChange}
        >
            <Auth
                theme="dark"
                magicLink
                providers={['github']}
                supabaseClient={supabaseClient}
                appearance={{
                    theme: ThemeSupa,
                    variables: {
                        default: {
                            colors: {
                                brand: '#404040',
                                brandAccent: '#22c55e',
                            }
                        }
                    }
                }}
            />
        </Modal>
    );
}

export default AuthModal;