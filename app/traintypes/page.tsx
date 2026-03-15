"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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

            // 1️⃣ Fetch train types
            const { data: types, error: typesError } = await supabaseClient
                .from("train_types")
                .select("id, name, class_name")
                .order("name");

            if (typesError || !types) {
                console.error(typesError);
                setLoading(false);
                return;
            }

            // 2️⃣ Fetch image relations
            const { data: relations, error: relError } = await supabaseClient
                .from("train_image_trains")
                .select(`
                    train_image_id,
                    train:trains (
                        train_type_id
                    ),
                    image:train_images (
                        image_path
                    )
                `);

            if (relError || !relations) {
                console.error(relError);
                setLoading(false);
                return;
            }

            // 3️⃣ Build map of train types
            const typeMap = new Map<number, TrainTypeCard>();

            types.forEach(type => {
                typeMap.set(type.id, {
                    ...type,
                    photo_count: 0
                });
            });

            // 4️⃣ Aggregate counts
            const imagesPerType: Record<number, string[]> = {};

            relations.forEach((r: any) => {
                const typeId = r.train?.train_type_id;
                const imagePath = r.image?.image_path;

                if (!typeId || !imagePath) return;

                if (!imagesPerType[typeId]) imagesPerType[typeId] = [];
                imagesPerType[typeId].push(imagePath);
            });

            // 5️⃣ Populate counts + random image
            Object.entries(imagesPerType).forEach(([typeId, images]) => {
                const id = Number(typeId);
                const type = typeMap.get(id);

                if (!type) return;

                type.photo_count = images.length;
                type.random_image_path =
                    images[Math.floor(Math.random() * images.length)];
            });

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
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold text-black dark:text-white mb-8">
                    All Train Types
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trainTypes.map(type => (
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