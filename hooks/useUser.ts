import { useEffect, useState } from 'react';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase';

export const useUser = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        const getUser = async () => {
            const { data: { session } } = await supabaseClient.auth.getSession();
            setUser(session?.user ?? null);
            setIsLoading(false);
        };

        getUser();

        // Listen for auth changes
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
            (_event: AuthChangeEvent, session: Session | null) => {
                setUser(session?.user ?? null);
                setIsLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return {
        user,
        isLoading,
    };
};
