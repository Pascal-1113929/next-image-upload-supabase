"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxInput,
    ComboboxList,
} from "../ui/combobox";

interface FormData {
    title: string;
    description: string;
    image: FileList;
    isPrivate: boolean;
    trains: { operatorId: string; trainNumber: string; trainTypeId: string }[];
}

interface Station {
    id: number;
    name: string;
}

interface TrainType {
    id: number;
    name: string;
    class_name: string;
}

interface TrainOperator {
    id: number;
    name: string;
    country_code: string;
}

interface Train {
    id: number;
    train_number: string;
    train_type_id: number;
    operator_id: number;
}

const PhotoUploadModal = () => {
    const router = useRouter();
    const uploadModal = usePhotoUploadModal();
    const { user } = useUser();

    const [isLoading, setIsLoading] = useState(false);
    const [stations, setStations] = useState<Station[]>([]);
    const [trainTypes, setTrainTypes] = useState<TrainType[]>([]);
    const [operators, setOperators] = useState<TrainOperator[]>([]);
    const [trains, setTrains] = useState<Train[]>([]);

    const [selectedStation, setSelectedStation] = useState("");
    const [selectedStationEnd, setSelectedStationEnd] = useState("");
    const [locationType, setLocationType] = useState<"station" | "route">("station");

    const [detectedDate, setDetectedDate] = useState("");
    const [suggestedStation, setSuggestedStation] = useState("");

    const [queryStation, setQueryStation] = useState("");       // for start station
    const [queryStationEnd, setQueryStationEnd] = useState(""); // for end station (route)

    const [manualDate, setManualDate] = useState("");

    const { register, handleSubmit, reset, watch, control, setValue } = useForm<FormData>({
        defaultValues: {
            title: "",
            description: "",
            isPrivate: false,
            trains: [{ operatorId: "", trainNumber: "", trainTypeId: "" }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "trains",
    });

    const imageFile = watch("image");

    const filteredStations = stations.filter((s) =>
        s.name.toLowerCase().includes(queryStation.toLowerCase())
    );

    const filteredStationsEnd = stations.filter((s) =>
        s.name.toLowerCase().includes(queryStationEnd.toLowerCase())
    );

    // Load stations, train types, operators, and trains
    useEffect(() => {
        const loadData = async () => {
            const pageSize = 1000;
            let from = 0;
            let allStations: Station[] = [];

            while (true) {
                const { data, error } = await supabaseClient
                    .from("train_stations")
                    .select("id, name")
                    .order("name")
                    .range(from, from + pageSize - 1);

                if (error) break;
                if (!data || data.length === 0) break;

                allStations = [...allStations, ...data];
                from += pageSize;
            }
            setStations(allStations);

            const { data: typesData } = await supabaseClient
                .from("train_types")
                .select("id, name, class_name")
                .order("name");

            const { data: operatorsData } = await supabaseClient
                .from("train_operators")
                .select("id, name, country_code")
                .order("name");

            const { data: trainsData } = await supabaseClient
                .from("trains")
                .select("id, train_number, train_type_id, operator_id")
                .order("train_number");

            if (typesData) setTrainTypes(typesData);
            if (operatorsData) setOperators(operatorsData);
            if (trainsData) setTrains(trainsData);
        };

        loadData();
    }, []);

    // Auto-detect train type per field
    const handleTrainNumberChange = async (index: number) => {
        const trainField = watch(`trains.${index}`);
        if (!trainField?.operatorId || !trainField?.trainNumber || trainField.trainNumber.length < 2) return;

        try {
            const { data, error } = await supabaseClient
                .from("trains")
                .select("train_type_id, id")
                .eq("operator_id", parseInt(trainField.operatorId))
                .eq("train_number", trainField.trainNumber)
                .single();

            if (!error && data?.train_type_id) {
                setValue(`trains.${index}.trainTypeId`, data.train_type_id.toString());
                toast.success(`Auto-detected train type for ${trainField.trainNumber}`, { duration: 2000 });
            }
        } catch (err) {
            console.error("Error fetching train type:", err);
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        toast.loading("Extracting metadata...", { id: "metadata" });

        try {
            const metadata = await extractMetadata(file);

            if (metadata.takenAt) {
                const dateStr = metadata.takenAt.toISOString().slice(0, 16);
                setDetectedDate(dateStr);
                toast.success("Date extracted from image", { id: "metadata" });
            }

            if (metadata.location) {
                const nearest = await findNearestStation(
                    metadata.location.latitude,
                    metadata.location.longitude,
                    supabaseClient
                );

                if (nearest) {
                    if (nearest.distance <= 1.5) {
                        setLocationType("station");
                        setSelectedStation(nearest.id.toString());
                        setSelectedStationEnd("");
                        setSuggestedStation(nearest.name);
                        setQueryStation(nearest.name);
                        toast.success(`Detected station: ${nearest.name}`, { id: "metadata" });
                    } else {
                        const { data: closestStations } = await supabaseClient.rpc(
                            "find_two_nearest_stations",
                            {
                                lat: metadata.location.latitude,
                                lng: metadata.location.longitude
                            }
                        );
                        if (closestStations?.length === 2) {
                            setLocationType("route");
                            setSelectedStation(closestStations[0].id.toString());
                            setSelectedStationEnd(closestStations[1].id.toString());
                            toast.success(
                                `Detected route: ${closestStations[0].name} → ${closestStations[1].name}`,
                                { id: "metadata" }
                            );
                        }
                    }
                } else {
                    toast.success("Metadata extracted", { id: "metadata" });
                }
            } else {
                toast.success("Metadata extracted (no GPS data)", { id: "metadata" });
            }
        } catch (error) {
            console.error(error);
            toast.error("Could not extract metadata", { id: "metadata" });
        }
    };

    const handleStationChange = (val: string | null) => {
        setSelectedStation(val || "");
        setQueryStation(stations.find(s => s.id.toString() === val)?.name || "");
    };

    const handleEndStationChange = (val: string | null) => {
        setSelectedStationEnd(val || "");
        setQueryStationEnd(stations.find(s => s.id.toString() === val)?.name || "");
    };

    const onSubmit = async (data: FormData) => {
        try {
            setIsLoading(true);

            const imageFile = data.image?.[0];

            if (!user) {
                toast.error("You must be logged in to upload a photo");
                return;
            }

            if (!imageFile) {
                toast.error("Please select an image");
                return;
            }

            if (!detectedDate && !manualDate) {
                toast.error("Please select the date when the photo was taken");
                return;
            }

            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError || !session?.user) {
                toast.error("Your session has expired. Please login again.");
                return;
            }

            const metadata = await extractMetadata(imageFile);
            const uniqueID = uniqid();
            const fileExt = imageFile.name.split(".").pop();
            const fileName = `${user.id}/${uniqueID}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from("train-images")
                .upload(fileName, imageFile, { cacheControl: "3600", upsert: false });

            if (uploadError) throw uploadError;

            let locationId: number | null = null;
            if (selectedStation) {
                const { data: locationData } = await supabaseClient
                    .from("train_image_locations")
                    .insert({
                        user_id: user.id,
                        location_type: locationType,
                        station_id: parseInt(selectedStation),
                        station_id_end: locationType === "route" && selectedStationEnd ? parseInt(selectedStationEnd) : null,
                    })
                    .select()
                    .single();
                locationId = locationData?.id ?? null;
            }

            const { data: imageData, error: insertError } = await supabaseClient
                .from("train_images")
                .insert({
                    user_id: user.id,
                    location_id: locationId,
                    title: data.title || null,
                    description: data.description || null,
                    taken_at: metadata.takenAt || new Date(),
                    is_private: data.isPrivate,
                    image_path: uploadData.path,
                    mime_type: imageFile.type,
                    file_size_bytes: imageFile.size,
                    width_px: metadata.width || null,
                    height_px: metadata.height || null,
                    original_metadata: { location: metadata.location, full_metadata: metadata },
                })
                .select()
                .single();

            if (insertError) throw insertError;

            const imageId = imageData.id;

            // Insert multiple trains
            const trainRelations = data.trains
                .filter(t => t.trainNumber && t.operatorId)
                .map(t => ({
                    train_image_id: imageId,
                    train_id: trains.find(tr => tr.train_number === t.trainNumber && tr.operator_id === parseInt(t.operatorId))?.id,
                }))
                .filter(t => t.train_id); // remove undefined

            if (trainRelations.length > 0) {
                const { error: relationError } = await supabaseClient
                    .from("train_image_trains")
                    .insert(trainRelations);

                if (relationError) throw relationError;
            }

            toast.success("Photo uploaded successfully!");
            router.refresh();
            reset();
            setSelectedStation("");
            setDetectedDate("");
            uploadModal.onClose();
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-4 w-[60vw] pr-2">
            {/* Image Upload */}
            <div className="bg-neutral-100 p-4 rounded-lg border-2 border-neutral-700">
                <Label htmlFor="image" className="text-base font-semibold">Photo * <span className="text-xs text-neutral-400 font-normal">(Required)</span></Label>
                <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    disabled={isLoading}
                    {...register("image", { required: true })}
                    onChange={(e) => { register("image").onChange(e); handleImageChange(e); }}
                    className="mt-2 cursor-pointer"
                />
                {detectedDate ? (
                    <div className="text-sm text-green-400 mt-2 flex items-center gap-2">
                        <span className="text-lg">📅</span>
                        <span>Detected date: {new Date(detectedDate).toLocaleDateString()}</span>
                    </div>
                ) : (
                    <div className="mt-3">
                        <Label htmlFor="manualDate" className="text-sm font-medium">Photo Date *</Label>
                        <Input
                            id="manualDate"
                            type="date"
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            disabled={isLoading}
                            className="mt-1.5"
                        />
                        <p className="text-xs text-neutral-400 mt-1">No date found in image metadata.</p>
                    </div>
                )}
            </div>

            {/* Train Fields */}
            <div className="bg-neutral-100 p-4 rounded-lg border-2 border-neutral-700">
                <h3 className="text-base font-semibold mb-3 text-black">Train(s) in Photo</h3>
                {fields.map((field, index) => (
                    <div key={field.id} className="mb-4 border p-3 rounded-md">
                        {/* Operator */}
                        <Label className="text-sm font-medium">Operator</Label>
                        <Select
                            disabled={isLoading}
                            value={watch(`trains.${index}.operatorId`)}
                            onValueChange={val => setValue(`trains.${index}.operatorId`, val)}
                        >
                            <SelectTrigger className="mt-1.5">
                                <SelectValue placeholder="Select operator" />
                            </SelectTrigger>
                            <SelectContent>
                                {operators.map(op => (
                                    <SelectItem key={op.id} value={op.id.toString()}>{op.name} ({op.country_code})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Train Number */}
                        <Label className="text-sm font-medium mt-2">Train Number</Label>
                        <Input
                            placeholder="e.g., 8001, ICE 123"
                            disabled={isLoading}
                            {...register(`trains.${index}.trainNumber`)}
                            onBlur={() => handleTrainNumberChange(index)}
                            className="mt-1.5"
                        />

                        {/* Train Type */}
                        <Label className="text-sm font-medium mt-2">Train Type</Label>
                        <Select
                            disabled={isLoading}
                            value={watch(`trains.${index}.trainTypeId`)}
                            onValueChange={val => setValue(`trains.${index}.trainTypeId`, val)}
                        >
                            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select train type" /></SelectTrigger>
                            <SelectContent>
                                {trainTypes.map(tt => (
                                    <SelectItem key={tt.id} value={tt.id.toString()}>{tt.name} ({tt.class_name})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {fields.length > 1 && (
                            <Button variant="destructive" size="sm" className="mt-2" onClick={() => remove(index)}>Remove Train</Button>
                        )}
                    </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => append({ operatorId: "", trainNumber: "", trainTypeId: "" })}>
                    + Add Another Train
                </Button>
            </div>

            {/* Location */}
            <div className="bg-neutral-100 p-4 rounded-lg border-2 border-neutral-700">
                <h3 className="text-base font-semibold mb-3 text-black">Location</h3>

                <Label>Location Type</Label>
                <Select value={locationType} onValueChange={(v) => setLocationType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="station">At Station</SelectItem>
                        <SelectItem value="route">Between Stations</SelectItem>
                    </SelectContent>
                </Select>

                <Label htmlFor="station" className="text-sm font-medium mt-2">
                    Station {suggestedStation && <span className="text-green-400 text-xs">📍 GPS-detected: {suggestedStation}</span>}
                </Label>
                <Combobox value={selectedStation} onValueChange={handleStationChange} modal={false}>
                    <ComboboxInput
                        placeholder="Search station..."
                        value={queryStation}
                        onChange={(e) => setQueryStation(e.target.value)}
                        showClear
                    />
                    <ComboboxContent side="bottom" sideOffset={4}>
                        <ComboboxList className="max-h-60 overflow-y-auto">
                            {filteredStations.length > 0 ? filteredStations.map(s => (
                                <ComboboxItem key={s.id} value={s.id.toString()}>{s.name}</ComboboxItem>
                            )) : <ComboboxEmpty>No stations found</ComboboxEmpty>}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>

                {locationType === "route" && (
                    <>
                        <Label className="mt-2">End Station</Label>
                        <Combobox value={selectedStationEnd} onValueChange={handleEndStationChange} modal={false}>
                            <ComboboxInput
                                placeholder="Search end station..."
                                value={queryStationEnd}
                                onChange={(e) => setQueryStationEnd(e.target.value)}
                                showClear
                                disabled={isLoading}
                            />
                            <ComboboxContent>
                                <ComboboxList>
                                    {filteredStationsEnd.length > 0 ? filteredStationsEnd.map(s => (
                                        <ComboboxItem key={s.id} value={s.id.toString()}>{s.name}</ComboboxItem>
                                    )) : <ComboboxEmpty>No stations found</ComboboxEmpty>}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </>
                )}
            </div>

            {/* Photo Information */}
            <div className="bg-neutral-100 p-4 rounded-lg border-2 border-neutral-700">
                <Label className="text-sm font-medium">Title</Label>
                <Input {...register("title")} placeholder="Optional title" className="mt-1.5" disabled={isLoading} />

                <Label className="text-sm font-medium mt-2">Description</Label>
                <Input {...register("description")} placeholder="Optional description" className="mt-1.5" disabled={isLoading} />

                <Label className="text-sm font-medium mt-2">Private?</Label>
                <Select value={watch("isPrivate") ? "1" : "0"} onValueChange={v => setValue("isPrivate", v === "1")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0">Public</SelectItem>
                        <SelectItem value="1">Private</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button type="submit" disabled={isLoading} className="mt-4">
                {isLoading ? "Uploading..." : "Upload Photo"}
            </Button>
        </form>
    );
};

export default PhotoUploadModal;