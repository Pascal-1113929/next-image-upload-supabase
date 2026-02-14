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
    user_id: string;
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

                // Transform the data structure: lift stations out of location
                const transformedData: TrainImageDetail = {
                    ...data,
                    startStation: data.location?.station?.[0] || null,
                    endStation: data.location?.station_end?.[0] || null,
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
                                <div>
                                    <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                                        Location
                                    </div>
                                    <div className="text-zinc-600 dark:text-zinc-400">
                                        📍{' '}
                                        {photo.location?.location_type === "route" ? (
                                            // It's a route
                                            <>
                                                {photo.location?.station?.name || "Unknown"}{" "}
                                                <span className="text-xs">
                                                    ({photo.location?.station?.country_code || "??"})
                                                </span>{" "}
                                                -{" "}
                                                {photo.location?.station_end?.name || "Unknown"}{" "}
                                                <span className="text-xs">
                                                    ({photo.location?.station_end?.country_code || "??"})
                                                </span>
                                            </>
                                        ) : (
                                            // Single station
                                            <>
                                                {photo.location?.station?.name || "Unknown"}{" "}
                                                <span className="text-xs">
                                                    ({photo.location?.station?.country_code || "??"})
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>


                                <div>
                                    <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                                        Date Taken
                                    </div>
                                    <div className="text-zinc-600 dark:text-zinc-400">
                                        📅 {new Date(photo.taken_at).toLocaleString()}
                                    </div>
                                </div>

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
                                {photo.original_metadata?.location && (
                                    <div className="pt-2">
                                        <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                                            Map
                                        </div>
                                        <div className="mt-2 aspect-video w-full overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
                                            <iframe
                                                title="Photo location"
                                                className="h-full w-full"
                                                loading="lazy"
                                                referrerPolicy="no-referrer-when-downgrade"
                                                src={`https://www.google.com/maps?q=${photo.original_metadata.location.latitude},${photo.original_metadata.location.longitude}&output=embed`}
                                            />
                                        </div>
                                    </div>
                                )}
                                {photo.original_metadata && (
                                    <details className="rounded border border-zinc-200 dark:border-zinc-800">
                                        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                            Original Metadata
                                        </summary>
                                        <div className="px-3 pb-3">
                                            <pre className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded text-xs overflow-x-auto">
                                                {JSON.stringify(photo.original_metadata, null, 2)}
                                            </pre>
                                        </div>
                                    </details>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
