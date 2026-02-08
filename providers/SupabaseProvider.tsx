"use client"

interface SupabaseProviderProps {
    children: React.ReactNode
};

const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
    return <>{children}</>
}

export default SupabaseProvider;