"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser } from "@/hooks/useUser";
import { supabaseClient } from "@/lib/supabase";
import { usePhotoUploadModal } from "@/hooks/usePhotoUploadModal";
import { useAuthModal } from "@/hooks/useAuthModal";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

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
        station: {          // start station
            id: number;
            name: string;
            country_code: string;
        } | null;
        station_end: {      // end station
            id: number;
            name: string;
            country_code: string;
        } | null;
    } | null;
}


export default function PhotosPage() {
    const router = useRouter();
    const { user } = useUser();
    // const photoUploadModal = usePhotoUploadModal();
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
                        id,
                        title,
                        description,
                        image_path,
                        taken_at,
                        is_private,
                        created_at,
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

                // If user is logged in, show their private photos too
                if (user) {
                    query = query.or(`is_private.eq.false,user_id.eq.${user.id}`);
                } else {
                    query = query.eq("is_private", false);
                }

                const { data, error } = await query;

                if (error) {
                    console.error("Error loading photos:", error);
                    return;
                }

                // Transform the data structure
                const transformedData = data?.map((photo: any) => ({
                    ...photo,
                    startStation: photo.location?.station || null,
                    endStation: photo.location?.station_end || null,
                }));

                setPhotos(transformedData || []);
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };

        loadPhotos();
    }, [user]);

    console.log("Loaded photos:", photos);

    const getImageUrl = (path: string) => {
        const { data } = supabaseClient.storage
            .from("train-images")
            .getPublicUrl(path);
        return data.publicUrl;
    };

    const handleUploadClick = () => {
        if (!user) {
            authModal.onOpen();
        } else {
            return router.push("/photos/upload");
            // photoUploadModal.onOpen();
        }
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
                                <CardHeader>
                                    <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                                </CardHeader>
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
                            <Card
                                key={photo.id}
                                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => router.push(`/photos/${photo.id}`)}
                            >
                                <div className="relative aspect-video bg-zinc-200 dark:bg-zinc-800">
                                    <Image
                                        src={getImageUrl(photo.image_path)}
                                        alt={photo.title || "Train photo"}
                                        fill
                                        className="object-cover"
                                    />
                                    {photo.is_private && (
                                        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                                            Private
                                        </div>
                                    )}
                                </div>
                                <CardHeader>
                                    <CardTitle className="line-clamp-1">
                                        {photo.title || "Untitled"}
                                    </CardTitle>
                                    <CardDescription className="space-y-1">
                                        <div className="flex items-center gap-1">
                                            <span>📍</span>
                                            {photo.location?.location_type === "route" ? (
                                                // route
                                                <span>
                                                    {photo.location.station?.name || "Unknown"}{" "}
                                                    <span className="text-xs">({photo.location.station?.country_code || "??"})</span>
                                                    {" - "}
                                                    {photo.location.station_end?.name || "Unknown"}{" "}
                                                    <span className="text-xs">({photo.location.station_end?.country_code || "??"})</span>
                                                </span>
                                            ) : (
                                                // Single station
                                                <span>
                                                    {photo.location?.station?.name || "Unknown"}{" "}
                                                    <span className="text-xs">({photo.location?.station?.country_code || "??"})</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span>📅</span>
                                            <span>
                                                {new Date(photo.taken_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </CardDescription>
                                </CardHeader>
                                {photo.description && (
                                    <CardContent>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                            {photo.description}
                                        </p>
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
