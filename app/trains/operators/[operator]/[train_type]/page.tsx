"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase";

interface Train {
  id: number;
  train_number: string;
  alt_number?: string;
  images?: {
    id: number;
    image_path: string;
    is_private: boolean;
  }[];
}

interface Operator {
  id: number;
  slug: string;
  name: string;
}

interface TrainType {
  id: number;
  name: string;
  class_name: string;
}

export default function TrainsOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const operatorSlug = params.operator as string;
  const trainTypeSlug = params.train_type as string;

  const [operator, setOperator] = useState<Operator | null>(null);
  const [trainType, setTrainType] = useState<TrainType | null>(null);
  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Fetch operator
      const { data: operatorData } = await supabaseClient
        .from("train_operators")
        .select("*")
        .ilike("slug", operatorSlug)
        .single();

      if (!operatorData) {
        setLoading(false);
        return;
      }
      setOperator(operatorData);

      // Fetch train type
      const { data: typeData } = await supabaseClient
        .from("train_types")
        .select("*")
        .eq("class_name", trainTypeSlug)
        .single();

      if (!typeData) {
        setLoading(false);
        return;
      }
      setTrainType(typeData);

      // Fetch trains
      const { data: trainData } = await supabaseClient
        .from("trains")
        .select(`
          id,
          train_number,
          alt_number,
          images:train_images (
            id,
            image_path,
            is_private
          )
        `)
        .eq("operator_id", operatorData.id)
        .eq("train_type_id", typeData.id);

      setTrains(trainData || []);
      setLoading(false);
    };

    loadData();
  }, [operatorSlug, trainTypeSlug]);

  const getImageUrl = (path: string) => {
    const { data } = supabaseClient.storage
      .from("train-images")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!operator || !trainType) return <div className="p-8">Not found</div>; 

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
      <div className="max-w-7xl mx-auto">

        <h1 className="text-4xl font-bold mb-4">
          Materieeloverzicht {trainType.name} van {operator.name}
        </h1>

        <div className="mb-6 text-zinc-600">
          Aantal: {trains.length}
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-100 dark:bg-zinc-900">
              <tr>
                <th className="p-4 border">Nr</th>
                <th className="p-4 border">Alt-Nr</th>
                <th className="p-4 border">Class</th>
                <th className="p-4 border">Foto's</th>
              </tr>
            </thead>

            <tbody>
              {trains.map((train) => {
                const publicImages =
                  train.images?.filter((img) => !img.is_private) || [];

                const preview =
                  publicImages.length > 0
                    ? publicImages[Math.floor(Math.random() * publicImages.length)]
                    : null;

                return (
                  <tr key={train.id} className="border-t cursor-pointer" onClick={() => {router.push(`/trains/train/${operator.slug + `_` + `${train.id}`}`)}}>
                    <td className="p-4 align-top">
                      <div className="font-semibold text-blue-600">
                        {train.train_number}
                      </div>

                      {preview && (
                        <div className="relative w-40 h-28 mt-2 rounded overflow-hidden">
                          <Image
                            src={getImageUrl(preview.image_path)}
                            alt={train.train_number}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                    </td>

                    <td className="p-4 align-top">{train.alt_number}</td>
                    <td className="p-4 align-top">{trainType.class_name}</td>
                    <td className="p-4 align-top">{publicImages.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}