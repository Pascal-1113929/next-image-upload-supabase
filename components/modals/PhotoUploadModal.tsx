"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import uniqid from "uniqid";

import Modal from "../Modal";
import { usePhotoUploadModal } from "@/hooks/usePhotoUploadModal";
import { useUser } from "@/hooks/useUser";
import { extractMetadata, findNearestStation } from "@/lib/metadata";
import { supabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface FormData {
    title: string;
    description: string;
    image: FileList;
    isPrivate: boolean;
}

interface Station {
    id: number;
    name: string;
}

const PhotoUploadModal = () => {
    const router = useRouter();
    const uploadModal = usePhotoUploadModal();
    const { user } = useUser();

    const [isLoading, setIsLoading] = useState(false);
    const [stations, setStations] = useState<Station[]>([]);
    const [selectedStation, setSelectedStation] = useState<string>("");
    const [detectedDate, setDetectedDate] = useState<string>("");
    const [suggestedStation, setSuggestedStation] = useState<string>("");

    const { register, handleSubmit, reset, watch } = useForm<FormData>({
        defaultValues: {
            title: "",
            description: "",
            isPrivate: false,
        },
    });

    const imageFile = watch("image");

    // Load stations on mount
    useEffect(() => {
        const loadStations = async () => {
            const { data, error } = await supabaseClient
                .from("train_stations")
                .select("id, name")
                .order("name");

            if (!error && data) {
                setStations(data);
            }
        };
        loadStations();
    }, []);

    // Extract metadata when image is selected
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        toast.loading("Extracting metadata...", { id: "metadata" });

        try {
            const metadata = await extractMetadata(file);

            // Set detected date
            if (metadata.takenAt) {
                const dateStr = metadata.takenAt.toISOString().slice(0, 16);
                setDetectedDate(dateStr);
                toast.success("Date extracted from image", { id: "metadata" });
            }

            // Find nearest station if GPS data available
            if (metadata.location) {
                const nearest = await findNearestStation(
                    metadata.location.latitude,
                    metadata.location.longitude,
                    supabaseClient
                );

                if (nearest) {
                    setSuggestedStation(nearest.name);
                    setSelectedStation(nearest.id.toString());
                    toast.success(
                        `Detected station: ${nearest.name} (${nearest.distance}km away)`,
                        { id: "metadata" }
                    );
                } else {
                    toast.success("Metadata extracted", { id: "metadata" });
                }
            } else {
                toast.success("Metadata extracted (no GPS data)", { id: "metadata" });
            }
        } catch (error) {
            console.error("Metadata extraction error:", error);
            toast.error("Could not extract metadata", { id: "metadata" });
        }
    };

    const onChange = (open: boolean) => {
        if (!open) {
            reset();
            setSelectedStation("");
            setDetectedDate("");
            setSuggestedStation("");
            uploadModal.onClose();
        }
    };

    const onSubmit = async (data: FormData) => {
        try {
            setIsLoading(true);

            const imageFile = data.image?.[0];

            if (!imageFile || !user) {
                toast.error("Please select an image");
                return;
            }

            // Extract full metadata
            const metadata = await extractMetadata(imageFile);

            // Generate unique filename
            const uniqueID = uniqid();
            const fileExt = imageFile.name.split(".").pop();
            const fileName = `${user.id}/${uniqueID}.${fileExt}`;

            // Upload image to storage
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from("train-images")
                .upload(fileName, imageFile, {
                    cacheControl: "3600",
                    upsert: false,
                });

            if (uploadError) {
                console.error(uploadError);
                toast.error("Failed to upload image");
                return;
            }

            // Insert image record
            const { error: insertError } = await supabaseClient
                .from("train_images")
                .insert({
                    user_id: user.id,
                    station_id: selectedStation ? parseInt(selectedStation) : null,
                    title: data.title || null,
                    description: data.description || null,
                    taken_at: metadata.takenAt || new Date(),
                    is_private: data.isPrivate,
                    image_path: uploadData.path,
                    mime_type: imageFile.type,
                    file_size_bytes: imageFile.size,
                    width_px: metadata.width || null,
                    height_px: metadata.height || null,
                    original_metadata: {
                        camera: metadata.camera,
                        location: metadata.location,
                        orientation: metadata.orientation,
                    },
                });

            if (insertError) {
                console.error(insertError);
                toast.error("Failed to save image data");
                return;
            }

            toast.success("Photo uploaded successfully!");
            router.refresh();
            reset();
            uploadModal.onClose();
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            title="Upload Train Photo"
            description="Upload your train photo with automatic metadata extraction"
            isOpen={uploadModal.isOpen}
            onChange={onChange}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                {/* Image Upload */}
                <div>
                    <Label htmlFor="image">Photo *</Label>
                    <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        disabled={isLoading}
                        {...register("image", { required: true })}
                        onChange={(e) => {
                            register("image").onChange(e);
                            handleImageChange(e);
                        }}
                        className="mt-1"
                    />
                </div>

                {/* Detected Date */}
                {detectedDate && (
                    <div className="text-sm text-green-400">
                        📅 Detected date: {new Date(detectedDate).toLocaleString()}
                    </div>
                )}

                {/* Station Select */}
                <div>
                    <Label htmlFor="station">
                        Station {suggestedStation && `(Suggested: ${suggestedStation})`}
                    </Label>
                    <Select
                        disabled={isLoading}
                        value={selectedStation}
                        onValueChange={setSelectedStation}
                    >
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a station" />
                        </SelectTrigger>
                        <SelectContent>
                            {stations.map((station) => (
                                <SelectItem key={station.id} value={station.id.toString()}>
                                    {station.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Title */}
                <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                        id="title"
                        placeholder="e.g., ICE 3 at Frankfurt Hbf"
                        disabled={isLoading}
                        {...register("title")}
                        className="mt-1"
                    />
                </div>

                {/* Description */}
                <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                        id="description"
                        placeholder="Optional description"
                        disabled={isLoading}
                        {...register("description")}
                        className="mt-1"
                    />
                </div>

                {/* Private checkbox */}
                <div className="flex items-center gap-2">
                    <input
                        id="isPrivate"
                        type="checkbox"
                        disabled={isLoading}
                        {...register("isPrivate")}
                        className="w-4 h-4"
                    />
                    <Label htmlFor="isPrivate" className="cursor-pointer">
                        Make this photo private
                    </Label>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "Uploading..." : "Upload Photo"}
                </Button>
            </form>
        </Modal>
    );
};

export default PhotoUploadModal;
