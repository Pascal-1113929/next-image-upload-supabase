import { create } from 'zustand';

interface PhotoUploadModalStore {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}

const usePhotoUploadModal = create<PhotoUploadModalStore>((set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
}));

export { usePhotoUploadModal };
