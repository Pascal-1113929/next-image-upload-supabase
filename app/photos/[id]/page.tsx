"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useUser } from "@/hooks/useUser";
import { supabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

interface TrainImageDetail {
    id: number;
    title: string | null;
    description: string | null;
    image_path: string;
    taken_at: string;
    is_private: boolean;
    width_px: number | null;
    height_px: number | null;
    file_size_bytes: number | null;
    original_metadata: any;
    station: {
        name: string;
        country_code: string | null;
    } | null;
    user: {
        display_name: string | null;
    } | null;
    created_at: string;
}

export default function PhotoDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();

    const [photo, setPhoto] = useState<TrainImageDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPhoto = async () => {
            if (!params.id) return;

            setLoading(true);

            try {
                const { data, error } = await supabaseClient
                    .from("train_images")
                    .select(`
            id,
            title,
            description,
            image_path,
            taken_at,
            is_private,
            user_id,
            width_px,
            height_px,
            file_size_bytes,
            original_metadata,
            created_at,
            train_stations (
              name,
              country_code
            ),
            profiles (
              display_name
            )
          `)
                    .eq("id", params.id)
                    .single();

                if (error) {
                    console.error("Error loading photo:", error);
                    return;
                }

                // Check if user has permission to view
                if (data.is_private && (!user || data.user_id !== user.id)) {
                    router.push("/photos");
                    return;
                }

                // Transform the data structure
                const transformedData: TrainImageDetail = {
                    ...data,
                    station: Array.isArray(data.train_stations) && data.train_stations.length > 0
                        ? data.train_stations[0]
                        : null,
                    user: Array.isArray(data.profiles) && data.profiles.length > 0
                        ? data.profiles[0]
                        : null,
                };

                setPhoto(transformedData);
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };

        loadPhoto();
    }, [params.id, user, router]);

    const getImageUrl = (path: string) => {
        const { data } = supabaseClient.storage
            .from("train-images")
            .getPublicUrl(path);
        return data.publicUrl;
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return "Unknown";
        const mb = bytes / 1024 / 1024;
        return `${mb.toFixed(2)} MB`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="animate-pulse">
                        <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-lg mb-6" />
                        <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2 mb-4" />
                        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full mb-2" />
                        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                    </div>
                </div>
            </div>
        );
    }

    if (!photo) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <h1 className="text-2xl font-bold mb-4">Photo not found</h1>
                    <Button onClick={() => router.push("/photos")}>
                        Back to Gallery
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
            <div className="max-w-5xl mx-auto">
                <Button
                    variant="outline"
                    onClick={() => router.push("/photos")}
                    className="mb-6"
                >
                    ← Back to Gallery
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Image */}
                    <div className="lg:col-span-2">
                        <div className="relative aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden">
                            <Image
                                src={getImageUrl(photo.image_path)}
                                alt={photo.title || "Train photo"}
                                fill
                                className="object-contain"
                                priority
                            />
                            {photo.is_private && (
                                <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded">
                                    🔒 Private
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details Sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>{photo.title || "Untitled"}</CardTitle>
                                {photo.description && (
                                    <CardDescription>{photo.description}</CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                {photo.station && (
                                    <div>
                                        <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                                            Station
                                        </div>
                                        <div className="text-zinc-600 dark:text-zinc-400">
                                            📍 {photo.station.name}
                                            {photo.station.country_code &&
                                                ` (${photo.station.country_code})`}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                                        Date Taken
                                    </div>
                                    <div className="text-zinc-600 dark:text-zinc-400">
                                        📅 {new Date(photo.taken_at).toLocaleString()}
                                    </div>
                                </div>

                                {photo.user?.display_name && (
                                    <div>
                                        <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                                            Uploaded by
                                        </div>
                                        <div className="text-zinc-600 dark:text-zinc-400">
                                            👤 {photo.user.display_name}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                                        Uploaded
                                    </div>
                                    <div className="text-zinc-600 dark:text-zinc-400">
                                        {new Date(photo.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Technical Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Technical Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {photo.width_px && photo.height_px && (
                                    <div>
                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                            Dimensions:{" "}
                                        </span>
                                        <span className="text-zinc-600 dark:text-zinc-400">
                                            {photo.width_px} × {photo.height_px} px
                                        </span>
                                    </div>
                                )}

                                {photo.file_size_bytes && (
                                    <div>
                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                            File Size:{" "}
                                        </span>
                                        <span className="text-zinc-600 dark:text-zinc-400">
                                            {formatFileSize(photo.file_size_bytes)}
                                        </span>
                                    </div>
                                )}

                                {photo.original_metadata?.camera && (
                                    <div>
                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                            Camera:{" "}
                                        </span>
                                        <span className="text-zinc-600 dark:text-zinc-400">
                                            {photo.original_metadata.camera}
                                        </span>
                                    </div>
                                )}

                                {photo.original_metadata?.location && (
                                    <div>
                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                            GPS:{" "}
                                        </span>
                                        <span className="text-zinc-600 dark:text-zinc-400 text-xs">
                                            {photo.original_metadata.location.latitude.toFixed(6)},{" "}
                                            {photo.original_metadata.location.longitude.toFixed(6)}
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
