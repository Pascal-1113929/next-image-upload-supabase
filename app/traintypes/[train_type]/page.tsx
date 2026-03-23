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
import { slugify, unslugify } from "@/lib/slug";

interface TrainType {
  id: number;
  name: string;
  class_name: string;
  description: string;
}

interface OperatorCard {
  id: number;
  name: string;
  slug: string;
  country_code: string | null;
  photo_count: number;
  random_image_path?: string;
}

export default function TrainTypePage() {
  const params = useParams();
  const trainTypeParam = params.train_type as string;
  const trainTypeName = unslugify(trainTypeParam)

  const [trainType, setTrainType] = useState<TrainType | null>(null);
  const [operators, setOperators] = useState<OperatorCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        // 1️⃣ Get train type
        const { data: typeData } = await supabaseClient
          .from("train_types")
          .select("id, name, class_name, description")
          .eq("class_name", trainTypeName)
          .single();

        if (!typeData) {
          setLoading(false);
          return;
        }

        setTrainType(typeData);

        // 2️⃣ Get all trains of this type, including their operator
        const { data: trains } = await supabaseClient
          .from("trains")
          .select(`
        id,
        operator:train_operators (
          id,
          name,
          slug,
          country_code
        )
      `)
          .eq("train_type_id", typeData.id);

        if (!trains || trains.length === 0) {
          setOperators([]);
          setLoading(false);
          return;
        }

        // 3️⃣ Build operator map with photo count placeholder
        const operatorMap = new Map<number, OperatorCard>();
        const trainsByOperator: Record<number, number[]> = {};

        trains.forEach((train: any) => {
          const operator = train.operator;
          if (!operator) return;

          if (!operatorMap.has(operator.id)) {
            operatorMap.set(operator.id, {
              ...operator,
              photo_count: 0,
              random_image_path: undefined
            });
          }

          if (!trainsByOperator[operator.id]) trainsByOperator[operator.id] = [];
          trainsByOperator[operator.id].push(train.id);
        });

        const operatorArray = Array.from(operatorMap.values());

        // 4️⃣ For each operator, get all images of their trains and pick a random one
        for (const operator of operatorArray) {
          const trainIds = trainsByOperator[operator.id];
          if (!trainIds || trainIds.length === 0) continue;

          const { data: relations } = await supabaseClient
            .from("train_image_trains")
            .select(`image:train_images (image_path)`)
            .in("train_id", trainIds);

          if (!relations || relations.length === 0) continue;

          // Extract image paths
          const imagePaths = relations
            .map((r: any) => r.image?.image_path)
            .filter(Boolean);

          if (imagePaths.length === 0) continue;

          // Set photo count
          operator.photo_count = imagePaths.length;

          // Pick one random image
          operator.random_image_path =
            imagePaths[Math.floor(Math.random() * imagePaths.length)];
        }

        setOperators(operatorArray);
      } catch (err) {
        console.error("Error loading operators:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [trainTypeParam]);

  const getImageUrl = (path: string) => {
    const { data } = supabaseClient.storage
      .from("train-images")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!trainType) return <div className="p-8">Not found</div>;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black dark:text-white">
            {trainType.name}
          </h1>
          <p className="text-zinc-500 mt-2">
            Class: {trainType.class_name}
          </p>
          {trainType.description && (
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              {trainType.description}
            </p>
          )}
        </div>

        {/* Operators */}
        <h2 className="text-2xl font-semibold mb-6">
          Operators using this train type
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {operators.map((operator) => (
            <Card key={operator.id} className="overflow-hidden">

              <CardHeader>
                <CardTitle>
                  <Link
                    href={`/trains/operators/${operator.slug}/${slugify(trainType.class_name)}`}
                    className="text-blue-600 hover:underline"
                  >
                    {operator.name}
                  </Link>
                </CardTitle>
              </CardHeader>

              {operator.random_image_path && (
                <div className="relative aspect-video">
                  <Image
                    src={getImageUrl(operator.random_image_path)}
                    alt={operator.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <CardContent className="flex justify-between items-center pt-4">
                <span className="text-sm text-zinc-500">
                  {operator.photo_count} photos
                </span>
              </CardContent>

            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}