"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { supabaseClient } from "@/lib/supabase";
import { useAuthModal } from "@/hooks/useAuthModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhotoCard } from "./components/PhotoCard";

interface TrainImage {
    id: number;
    title: string | null;
    description: string | null;
    image_path: string;
    taken_at: string;
    is_private: boolean;
    created_at: string;
    location: {
        location_type: string | null;
        station_id: number | null;
        station_id_end: number | null;
        station?: { id: number; name: string; country_code: string } | null;
        station_end?: { id: number; name: string; country_code: string } | null;
    } | null;
    trains: {
        id: number;
        train_number: string;
        alt_number: string | null;
        type?: { id: number; name: string; class_name: string } | null;
        operator?: { id: number; name: string; country_code: string } | null;
    }[];
}

export default function PhotosPage() {
    const router = useRouter();
    const { user } = useUser();
    const authModal = useAuthModal();

    const [photos, setPhotos] = useState<TrainImage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPhotos = async () => {
            setLoading(true);

            try {
                let query = supabaseClient
                    .from("train_images")
                    .select(`
                        *,
                        trains:train_image_trains (
                            train:trains (
                                id,
                                train_number,
                                alt_number,
                                type:train_types (id, name, class_name),
                                operator:train_operators (id, name, country_code)
                            )
                        ),
                        location:train_image_locations (
                            location_type,
                            station_id,
                            station_id_end,
                            station:train_stations!train_image_locations_station_id_fkey (
                                id,
                                name,
                                country_code
                            ),
                            station_end:train_stations!train_image_locations_station_id_end_fkey (
                                id,
                                name,
                                country_code
                            )
                        )
                    `)
                    .order("created_at", { ascending: false });

                if (user) {
                    query = query.or(`is_private.eq.false,user_id.eq.${user.id}`);
                } else {
                    query = query.eq("is_private", false);
                }

                const { data, error } = await query;
                if (error) throw error;

                const transformedData = data?.map((photo: any) => ({
                    ...photo,
                    trains: photo.trains?.map((t: any) => t.train) || [],
                }));

                console.log(transformedData)

                setPhotos(transformedData || []);
            } catch (error) {
                console.error("Error loading photos:", error);
            } finally {
                setLoading(false);
            }
        };

        loadPhotos();
    }, [user]);

    const getImageUrl = (path: string) => {
        const { data } = supabaseClient.storage.from("train-images").getPublicUrl(path);
        return data.publicUrl;
    };

    const handleUploadClick = () => {
        if (!user) return authModal.onOpen();
        return router.push("/photos/upload");
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
                            Train Photos
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Browse and upload train photos from around the world
                        </p>
                    </div>
                    <Button onClick={handleUploadClick} size="lg">
                        Upload Photo
                    </Button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <div className="aspect-video bg-zinc-200 dark:bg-zinc-800" />
                            </Card>
                        ))}
                    </div>
                ) : photos.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-xl text-zinc-500 dark:text-zinc-400 mb-4">
                            No photos yet
                        </p>
                        <Button onClick={handleUploadClick}>Upload the first photo</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {photos.map((photo) => (
                            <PhotoCard
                                key={photo.id}
                                photo={photo}
                                getImageUrl={getImageUrl}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}