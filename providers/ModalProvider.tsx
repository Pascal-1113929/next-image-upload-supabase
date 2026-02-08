"use client";

import { useEffect, useState } from "react";

import AuthModal from "@/components/modals/AuthModal";
import PhotoUploadModal from "@/components/modals/PhotoUploadModal";

interface ModalProviderProps {

}

const ModalProvider: React.FC<ModalProviderProps> = ({ }) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }

    return (
        <>
            <AuthModal />
            <PhotoUploadModal />
        </>
    );
}

export default ModalProvider;