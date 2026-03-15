"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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

            try {
                // 1️⃣ Fetch all operators
                const { data: ops, error: opsError } = await supabaseClient
                    .from("train_operators")
                    .select("id, name, slug")
                    .order("name");

                if (opsError || !ops) {
                    console.error("Error fetching operators:", opsError);
                    setLoading(false);
                    return;
                }

                // 2️⃣ Fetch all train-image relations
                const { data: relations, error: relError } = await supabaseClient
                    .from("train_image_trains")
                    .select(`
                        train:trains(operator_id),
                        image:train_images(image_path)
                    `);

                if (relError || !relations) {
                    console.error("Error fetching train-image relations:", relError);
                    setLoading(false);
                    return;
                }

                // 3️⃣ Build operator map
                const operatorMap = new Map<number, OperatorCard>();
                ops.forEach(op => {
                    operatorMap.set(op.id, { ...op, photo_count: 0 });
                });

                // 4️⃣ Collect images per operator
                const imagesPerOperator: Record<number, string[]> = {};

                relations.forEach((r: any) => {
                    const operatorId = r.train?.operator_id;
                    const imagePath = r.image?.image_path;

                    if (!operatorId || !imagePath) return;

                    if (!imagesPerOperator[operatorId]) {
                        imagesPerOperator[operatorId] = [];
                    }
                    imagesPerOperator[operatorId].push(imagePath);
                });

                // 5️⃣ Assign photo counts + random image per operator
                Object.entries(imagesPerOperator).forEach(([opId, images]) => {
                    const id = Number(opId);
                    const operator = operatorMap.get(id);
                    if (!operator) return;

                    operator.photo_count = images.length;
                    operator.random_image_path =
                        images[Math.floor(Math.random() * images.length)];
                });

                setOperators(Array.from(operatorMap.values()));
            } catch (err) {
                console.error("Unexpected error loading operators:", err);
            } finally {
                setLoading(false);
            }
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
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold text-black dark:text-white mb-8">
                    Train Operators
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {operators.map(op => (
                        <Card key={op.id} className="overflow-hidden">
                            <CardHeader>
                                <CardTitle>
                                    <Link
                                        href={`/trains/operators/${op.slug}`}
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