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
import toast from "react-hot-toast";

interface TrainImage {
    id: number;
    title: string | null;
    description: string | null;
    image_path: string;
    taken_at: string;
    is_private: boolean;
    station: {
        name: string;
    } | null;
    created_at: string;
}

export default function MyPhotosPage() {
    const router = useRouter();
    const { user } = useUser();
    // const photoUploadModal = usePhotoUploadModal();
    const authModal = useAuthModal();

    const [photos, setPhotos] = useState<TrainImage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            authModal.onOpen();
            router.push("/");
            return;
        }

        const loadMyPhotos = async () => {
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
            created_at,
            train_stations (
              name
            )
          `)
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                if (error) {
                    console.error("Error loading photos:", error);
                    toast.error("Failed to load photos");
                    return;
                }

                // Transform the data structure
                const transformedData = data?.map((photo: any) => ({
                    ...photo,
                    station: photo.train_stations,
                }));

                setPhotos(transformedData || []);
            } catch (error) {
                console.error("Error:", error);
                toast.error("Failed to load photos");
            } finally {
                setLoading(false);
            }
        };

        loadMyPhotos();
    }, [user, authModal, router]);

    const getImageUrl = (path: string) => {
        const { data } = supabaseClient.storage
            .from("train-images")
            .getPublicUrl(path);
        return data.publicUrl;
    };

    const handleDelete = async (id: number, imagePath: string) => {
        if (!confirm("Are you sure you want to delete this photo?")) {
            return;
        }

        try {
            // Delete from storage
            const { error: storageError } = await supabaseClient.storage
                .from("train-images")
                .remove([imagePath]);

            if (storageError) {
                console.error(storageError);
                toast.error("Failed to delete image file");
                return;
            }

            // Delete from database
            const { error: dbError } = await supabaseClient
                .from("train_images")
                .delete()
                .eq("id", id);

            if (dbError) {
                console.error(dbError);
                toast.error("Failed to delete image record");
                return;
            }

            toast.success("Photo deleted successfully");
            setPhotos(photos.filter((p) => p.id !== id));
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete photo");
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
                            My Photos
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Manage your uploaded train photos
                        </p>
                    </div>
                    <Button onClick={() => router.push("/photos/upload")} size="lg">
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
                            You haven't uploaded any photos yet
                        </p>
                        <Button onClick={() => router.push("/photos/upload")}>
                            Upload your first photo
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {photos.map((photo) => (
                            <Card key={photo.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <div
                                    className="relative aspect-video bg-zinc-200 dark:bg-zinc-800 cursor-pointer"
                                    onClick={() => router.push(`/photos/${photo.id}`)}
                                >
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
                                        {photo.station && (
                                            <div className="flex items-center gap-1">
                                                <span>📍</span>
                                                <span>{photo.station.name}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <span>📅</span>
                                            <span>
                                                {new Date(photo.taken_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => router.push(`/photos/${photo.id}`)}
                                        >
                                            View
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleDelete(photo.id, photo.image_path)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
