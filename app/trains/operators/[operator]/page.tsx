"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";
import { slugify } from "@/lib/slug";

interface Operator {
    id: number;
    name: string;
    slug: string;
    country_code: string | null;
}

interface TrainTypeCard {
    id: number;
    name: string;
    class_name: string;
    photo_count: number;
    random_image_path?: string;
}

export default function OperatorPage() {
    const params = useParams();
    const operatorParam = params.operator as string;

    const [operator, setOperator] = useState<Operator | null>(null);
    const [trainTypes, setTrainTypes] = useState<TrainTypeCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            try {
                // 1️⃣ Get operator by slug
                const { data: operatorData, error: opError } = await supabaseClient
                    .from("train_operators")
                    .select("id, name, country_code, slug")
                    .eq("slug", operatorParam)
                    .single();

                if (opError || !operatorData) {
                    console.error("Operator fetch error:", opError);
                    setLoading(false);
                    return;
                }

                setOperator(operatorData);

                // 2️⃣ Get all trains for this operator + their train types
                const { data: trains, error: trainsError } = await supabaseClient
                    .from("trains")
                    .select(`
                id,
                train_type:train_types (
                    id,
                    name,
                    class_name
                )
            `)
                    .eq("operator_id", operatorData.id);

                if (trainsError || !trains || trains.length === 0) {
                    setTrainTypes([]);
                    setLoading(false);
                    return;
                }

                // 3️⃣ Build unique train type map & group trains by type
                const typeMap = new Map<number, TrainTypeCard>();
                const trainsByType: Record<number, number[]> = {};

                trains.forEach((train: any) => {
                    const type = train.train_type;
                    if (!type) return;

                    if (!typeMap.has(type.id)) {
                        typeMap.set(type.id, {
                            id: type.id,
                            name: type.name,
                            class_name: type.class_name,
                            photo_count: 0,
                            random_image_path: undefined
                        });
                    }

                    if (!trainsByType[type.id]) trainsByType[type.id] = [];
                    trainsByType[type.id].push(train.id);
                });

                const typeArray = Array.from(typeMap.values());

                // 4️⃣ For each train type, fetch all images of its trains and pick a random one
                for (const type of typeArray) {
                    const trainIds = trainsByType[type.id];
                    if (!trainIds || trainIds.length === 0) continue;

                    const { data: relations, error: relError } = await supabaseClient
                        .from("train_image_trains")
                        .select(`image:train_images(image_path)`)
                        .in("train_id", trainIds);

                    if (relError || !relations || relations.length === 0) continue;

                    const imagePaths = relations
                        .map((r: any) => r.image?.image_path)
                        .filter(Boolean);

                    if (imagePaths.length === 0) continue;

                    // Set photo count
                    type.photo_count = imagePaths.length;

                    // Pick random image
                    type.random_image_path =
                        imagePaths[Math.floor(Math.random() * imagePaths.length)];
                }

                setTrainTypes(typeArray);
            } catch (err) {
                console.error("Unexpected error loading data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [operatorParam]);

    const getImageUrl = (path: string) => {
        const { data } = supabaseClient.storage
            .from("train-images")
            .getPublicUrl(path);
        return data.publicUrl;
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!operator) return <div className="p-8">Not found</div>;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-black dark:text-white">
                        {operator.name}
                    </h1>

                    {operator.country_code && (
                        <p className="text-zinc-500 mt-2">
                            Country: {operator.country_code}
                        </p>
                    )}
                </div>

                {/* Train Types */}
                <h2 className="text-2xl font-semibold mb-6">
                    Train types operated by {operator.name}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trainTypes.map((type) => (
                        <Card key={type.id} className="overflow-hidden">
                            <CardHeader>
                                <CardTitle>
                                    <Link
                                        href={`/trains/operators/${operator.slug}/${slugify(type.class_name)}`}
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