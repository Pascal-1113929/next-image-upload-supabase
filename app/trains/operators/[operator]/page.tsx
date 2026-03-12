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

interface Operator {
    id: number;
    name: string;
    country_code: string | null;
    description?: string | null;
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

            // 1️⃣ Get operator
            const { data: operatorData } = await supabaseClient
                .from("train_operators")
                .select("id, name, country_code")
                .eq("slug", operatorParam)
                .single();

            if (!operatorData) {
                setLoading(false);
                return;
            }

            setOperator(operatorData);

            // 2️⃣ Get trains of this operator
            const { data: trains } = await supabaseClient
                .from("trains")
                .select(`
          id,
          train_type:train_types (
            id,
            name,
            class_name
          ),
          images:train_images ( id )
        `)
                .eq("operator_id", operatorData.id);

            if (!trains) {
                setLoading(false);
                return;
            }

            const typeMap = new Map<number, TrainTypeCard>();

            trains.forEach((train: any) => {
                const type = train.train_type;
                if (!type) return;

                const count = train.images?.length || 0;

                if (!typeMap.has(type.id)) {
                    typeMap.set(type.id, {
                        ...type,
                        photo_count: count,
                    });
                } else {
                    typeMap.get(type.id)!.photo_count += count;
                }
            });

            const typeArray = Array.from(typeMap.values());

            // 3️⃣ Fetch ONE random image per train type
            for (const type of typeArray) {
                const { data: image } = await supabaseClient
                    .from("train_images")
                    .select("image_path")
                    .eq("train_type_id", type.id)
                    .in(
                        "train_id",
                        (
                            await supabaseClient
                                .from("trains")
                                .select("id")
                                .eq("operator_id", operatorData.id)
                                .eq("train_type_id", type.id)
                        ).data?.map((t: any) => t.id) || []
                    )
                    .limit(1);

                if (image && image.length > 0) {
                    type.random_image_path = image[0].image_path;
                }
            }

            setTrainTypes(typeArray);
            setLoading(false);
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

                    {operator.description && (
                        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                            {operator.description}
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
                                        href={`/trains/operators/${operator.name.replace(/\s+/g, "-")}/${type.class_name}`}
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