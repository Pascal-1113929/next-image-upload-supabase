"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";

interface TrainTypeCard {
    id: number;
    name: string;
    class_name: string;
    photo_count: number;
    random_image_path?: string;
}

export default function AllTrainTypesPage() {
    const [trainTypes, setTrainTypes] = useState<TrainTypeCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            // 1️⃣ Fetch all train types
            const { data: types, error } = await supabaseClient
                .from("train_types")
                .select("id, name, class_name");

            if (error || !types) {
                console.error("Error fetching train types:", error);
                setLoading(false);
                return;
            }

            const typeMap = new Map<number, TrainTypeCard>();

            // 2️⃣ Count photos per type
            for (const type of types) {
                const { data: images } = await supabaseClient
                    .from("train_images")
                    .select("image_path")
                    .eq("train_type_id", type.id);

                typeMap.set(type.id, {
                    ...type,
                    photo_count: images?.length || 0,
                    random_image_path: images && images.length > 0
                        ? images[Math.floor(Math.random() * images.length)].image_path
                        : undefined,
                });
            }

            setTrainTypes(Array.from(typeMap.values()));
            setLoading(false);
        };

        loadData();
    }, []);

    const getImageUrl = (path: string) => {
        const { data } = supabaseClient.storage
            .from("train-images")
            .getPublicUrl(path);
        return data.publicUrl;
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (trainTypes.length === 0) return <div className="p-8">No train types found</div>;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold text-black dark:text-white mb-8">
                    All Train Types
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trainTypes.map((type) => (
                        <Card key={type.id} className="overflow-hidden">
                            <CardHeader>
                                <CardTitle>
                                    <Link
                                        href={`/traintypes/${type.class_name}`}
                                        className="text-blue-600 hover:underline"
                                    >
                                        {type.name}
                                    </Link>
                                </CardTitle>
                            </CardHeader>

                            {type.random_image_path && (
                                <div className="relative aspect-video">
                                    <Image
                                        src={getImageUrl(type.random_image_path)}
                                        alt={type.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}

                            <CardContent className="flex justify-between items-center pt-4">
                                <span className="text-sm text-zinc-500">
                                    {type.photo_count} photos
                                </span>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}