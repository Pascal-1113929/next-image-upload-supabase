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

interface OperatorCard {
    id: number;
    name: string;
    slug: string;
    photo_count: number;
    random_image_path?: string;
}

export default function AllOperatorsPage() {
    const [operators, setOperators] = useState<OperatorCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            // 1️⃣ Fetch all operators
            const { data: ops, error } = await supabaseClient
                .from("train_operators")
                .select("id, name, slug");

            if (error || !ops) {
                console.error("Error fetching operators:", error);
                setLoading(false);
                return;
            }

            const operatorMap = new Map<number, OperatorCard>();

            // 2️⃣ Fetch photos belonging to trains of that operator
            for (const op of ops) {
                const { data: images } = await supabaseClient
                    .from("train_images")
                    .select("image_path, trains!inner(operator_id)")
                    .eq("trains.operator_id", op.id);

                operatorMap.set(op.id, {
                    ...op,
                    photo_count: images?.length || 0,
                    random_image_path:
                        images && images.length > 0
                            ? images[Math.floor(Math.random() * images.length)].image_path
                            : undefined,
                });
            }

            setOperators(Array.from(operatorMap.values()));
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
    if (operators.length === 0) return <div className="p-8">No operators found</div>;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold text-black dark:text-white mb-8">
                    Train Operators
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {operators.map((op) => (
                        <Card key={op.id} className="overflow-hidden">
                            <CardHeader>
                                <CardTitle>
                                    <Link
                                        href={`/operators/${op.slug}`}
                                        className="text-blue-600 hover:underline"
                                    >
                                        {op.name}
                                    </Link>
                                </CardTitle>
                            </CardHeader>

                            {op.random_image_path && (
                                <div className="relative aspect-video">
                                    <Image
                                        src={getImageUrl(op.random_image_path)}
                                        alt={op.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}

                            <CardContent className="flex justify-between items-center pt-4">
                                <span className="text-sm text-zinc-500">
                                    {op.photo_count} photos
                                </span>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}