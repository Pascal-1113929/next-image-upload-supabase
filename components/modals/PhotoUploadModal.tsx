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
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxInput, ComboboxList, } from "../ui/combobox";  

interface FormData {
    title: string;
    description: string;
    image: FileList;
    isPrivate: boolean;
    trainNumber: string;
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

    const [selectedStation, setSelectedStation] = useState("");
    const [selectedStationEnd, setSelectedStationEnd] = useState("");
    const [locationType, setLocationType] = useState<"station" | "route">("station");

    const [selectedTrainType, setSelectedTrainType] = useState("");
    const [selectedOperator, setSelectedOperator] = useState("");
    const [trainId, setTrainId] = useState<number | null>(null);

    const [detectedDate, setDetectedDate] = useState("");
    const [suggestedStation, setSuggestedStation] = useState("");
    const [suggestedTrainType, setSuggestedTrainType] = useState("");

    const [queryStation, setQueryStation] = useState("");       // for start station
    const [queryStationEnd, setQueryStationEnd] = useState(""); // for end station (route)

    const { register, handleSubmit, reset, watch } = useForm<FormData>({
        defaultValues: {
            title: "",
            description: "",
            isPrivate: false,
            trainNumber: "",
        },
    });

    const imageFile = watch("image");
    const trainNumber = watch("trainNumber");

    const filteredStations = stations.filter((s) =>
        s.name.toLowerCase().includes(queryStation.toLowerCase())
    );

    const filteredStationsEnd = stations.filter((s) =>
        s.name.toLowerCase().includes(queryStationEnd.toLowerCase())
    );

    // Load stations, train types, and operators on mount
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

                if (error) {
                    console.error("Stations fetch error:", error);
                    break;
                }

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

            if (allStations) setStations(allStations);
            if (typesData) setTrainTypes(typesData);
            if (operatorsData) setOperators(operatorsData);
        };

        loadData();
    }, []);

    // Dynamically suggest train type when operator and train number are filled
    useEffect(() => {
        const suggestTrainType = async () => {
            if (!selectedOperator || !trainNumber || trainNumber.length < 2) {
                setSuggestedTrainType("");
                return;
            }

            try {
                const { data, error } = await supabaseClient
                    .from("trains")
                    .select("train_type_id, id")
                    .eq("operator_id", parseInt(selectedOperator))
                    .eq("train_number", trainNumber)
                    .single();

                if (!error && data && data.train_type_id) {
                    const trainType = trainTypes.find(t => t.id === data.train_type_id);
                    if (trainType) {
                        setSuggestedTrainType(trainType.name);
                        setSelectedTrainType(data.train_type_id.toString());
                        setTrainId(data.id);
                        toast.success(`Train type detected: ${trainType.name}`, { duration: 3000 });
                    }
                } else {
                    setSuggestedTrainType("");
                }
            } catch (error) {
                console.error("Error fetching train type:", error);
            }
        };

        const debounceTimer = setTimeout(suggestTrainType, 500);
        return () => clearTimeout(debounceTimer);
    }, [selectedOperator, trainNumber, trainTypes]);

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
                    console.log("Nearest station:", nearest);
                    if (nearest.distance <= 1.5) {
                        setLocationType("station");
                        setSelectedStation(nearest.id.toString());
                        setSelectedStationEnd("");
                        setSuggestedStation(nearest.name);
                        setQueryStation(nearest.name); // <-- prefill the combobox input
                        console.log("Nearest id that will be set:", nearest.id.toString());

                        toast.success(`Detected station: ${nearest.name}`, { id: "metadata" });
                    } else {
                        console.log("No station within 1.5km, checking for routes...");
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
            console.error("Metadata extraction error:", error);
            toast.error("Could not extract metadata", { id: "metadata" });
        }
    };

    const onChange = (open: boolean) => {
        if (!open) {
            reset();
            setSelectedStation("");
            setSelectedTrainType("");
            setSelectedOperator("");
            setDetectedDate("");
            setSuggestedStation("");
            setSuggestedTrainType("");
            uploadModal.onClose();
        }
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

            // Verify session is valid before proceeding
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

            if (sessionError || !session || !session.user) {
                console.error("Session error:", sessionError);
                toast.error("Your session has expired. Please login again.");
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

            // create location row
            let locationId: number | null = null;

            if (selectedStation) {
                const { data: locationData, error: locationError } = await supabaseClient
                    .from("train_image_locations")
                    .insert({
                        user_id: user.id,
                        location_type: locationType,
                        station_id: parseInt(selectedStation),
                        station_id_end:
                            locationType === "route" && selectedStationEnd
                                ? parseInt(selectedStationEnd)
                                : null,
                    })
                    .select()
                    .single();

                if (locationError) throw locationError;
                locationId = locationData.id;

                if (locationError) {
                    console.error("Location insert error:", locationError);
                    toast.error("Failed to save location data: " + (locationError || "Unknown error"));
                    return;
                }
            }

            // Insert image record
            const { error: insertError } = await supabaseClient
                .from("train_images")
                .insert({
                    user_id: user.id,
                    location_id: locationId,
                    train_type_id: selectedTrainType ? parseInt(selectedTrainType) : null,
                    train_id: trainId,
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
                        location: metadata.location,
                        full_metadata: metadata
                    },
                });

            if (insertError) {
                console.error("Insert error:", insertError);
                toast.error("Failed to save image data: " + (insertError.message || "Unknown error"));
                return;
            }

            toast.success("Photo uploaded successfully!");
            router.refresh();
            reset();
            setSelectedStation("");
            setSelectedTrainType("");
            setSelectedOperator("");
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
            {/* Image Upload - Priority Field */}
            <div className="bg-neutral-100 p-4 rounded-lg border-2 border-neutral-700">
                <Label htmlFor="image" className="text-base font-semibold">
                    Photo * <span className="text-xs text-neutral-400 font-normal">(Required)</span>
                </Label>
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
                    className="mt-2 cursor-pointer"
                />
                {/* Detected Date */}
                {detectedDate && (
                    <div className="text-sm text-green-400 mt-2 flex items-center gap-2">
                        <span className="text-lg">📅</span>
                        <span>Detected date: {new Date(detectedDate).toLocaleString()}</span>
                    </div>
                )}
            </div>

            {/* Train Details Section */}
            <div className="bg-neutral-100 p-4 rounded-lg border-2 border-neutral-700">
                <h3 className="text-base font-semibold mb-3 text-black">Train Details</h3>

                {/* Train Operator */}
                <div className="mb-3">
                    <Label htmlFor="operator" className="text-sm font-medium">
                        Train Operator
                    </Label>
                    <Select
                        disabled={isLoading}
                        value={selectedOperator}
                        onValueChange={setSelectedOperator}
                    >
                        <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select operator" />
                        </SelectTrigger>
                        <SelectContent>
                            {operators.map((operator) => (
                                <SelectItem key={operator.id} value={operator.id.toString()}>
                                    {operator.name} ({operator.country_code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Train Number */}
                <div className="mb-3">
                    <Label htmlFor="trainNumber" className="text-sm font-medium">
                        Train Number
                    </Label>
                    <Input
                        id="trainNumber"
                        placeholder="e.g., 8001, ICE 123"
                        disabled={isLoading}
                        {...register("trainNumber")}
                        className="mt-1.5"
                    />
                    <p className="text-xs text-neutral-400 mt-1">
                        Enter operator first for auto-detection of train type
                    </p>
                </div>

                {/* Train Type */}
                <div>
                    <Label htmlFor="trainType" className="text-sm font-medium">
                        Train Type {suggestedTrainType && (
                            <span className="text-green-400 text-xs">
                                ✓ Auto-detected: {suggestedTrainType}
                            </span>
                        )}
                    </Label>
                    <Select
                        disabled={isLoading}
                        value={selectedTrainType}
                        onValueChange={setSelectedTrainType}
                    >
                        <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select train type" />
                        </SelectTrigger>
                        <SelectContent>
                            {trainTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id.toString()}>
                                    {type.name} ({type.class_name})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Location Section */}
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

                {/* Station Select */}
                <div>
                    <Label htmlFor="station" className="text-sm font-medium">
                        Station {suggestedStation && (
                            <span className="text-green-400 text-xs">
                                📍 GPS-detected: {suggestedStation}
                            </span>
                        )}
                    </Label>

                    <Combobox
                        value={selectedStation}
                        onValueChange={(val) => setSelectedStation(val || "")}
                        modal={false}
                    >
                        <ComboboxInput
                            placeholder="Search station..."
                            value={queryStation}
                            onChange={(e) => setQueryStation(e.target.value)}
                            showClear
                        />
                        <ComboboxContent side="bottom" sideOffset={4} className="z-50">
                            <ComboboxList className="max-h-60 overflow-y-auto">
                                {filteredStations.length > 0 ? (
                                    filteredStations.map((station) => (
                                        <ComboboxItem key={station.id} value={station.id.toString()}>
                                            {station.name}
                                        </ComboboxItem>
                                    ))
                                ) : (
                                    <ComboboxEmpty>No stations found</ComboboxEmpty>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                </div>

                <div>
                    {locationType === "route" && (
                        <>
                            <Label>End Station</Label>
                            {locationType === "route" && (
                                <Combobox
                                    value={selectedStationEnd}
                                    onValueChange={(val) => {
                                        setSelectedStationEnd(val || ""); // always string
                                        const stationName = stations.find(s => s.id.toString() === val)?.name || "";
                                        setQueryStationEnd(stationName); // update input display
                                    }}
                                    modal={false}
                                >
                                    <ComboboxInput
                                        placeholder="Search end station..."
                                        value={queryStationEnd}
                                        onChange={(e) => setQueryStationEnd(e.target.value)}
                                        showClear
                                        disabled={isLoading}
                                    />

                                    <ComboboxContent>
                                        <ComboboxList>
                                            {filteredStationsEnd.length > 0 ? (
                                                filteredStationsEnd.map((station) => (
                                                    <ComboboxItem key={station.id} value={station.id.toString()}>
                                                        {station.name}
                                                    </ComboboxItem>
                                                ))
                                            ) : (
                                                <ComboboxEmpty>No stations found</ComboboxEmpty>
                                            )}
                                        </ComboboxList>
                                    </ComboboxContent>
                                </Combobox>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Photo Information Section */}
            <div className="bg-neutral-100 p-4 rounded-lg border-2 border-neutral-700">
                <h3 className="text-base font-semibold mb-3 text-black">Photo Information</h3>

                {/* Title */}
                <div className="mb-3">
                    <Label htmlFor="title" className="text-sm font-medium">
                        Title
                    </Label>
                    <Input
                        id="title"
                        placeholder="e.g., ICE 3 at Frankfurt Hbf"
                        disabled={isLoading}
                        {...register("title")}
                        className="mt-1.5"
                    />
                </div>

                {/* Description */}
                <div className="mb-3">
                    <Label htmlFor="description" className="text-sm font-medium">
                        Description
                    </Label>
                    <Input
                        id="description"
                        placeholder="Optional description"
                        disabled={isLoading}
                        {...register("description")}
                        className="mt-1.5"
                    />
                </div>

                {/* Private checkbox */}
                <div className="flex items-center gap-2">
                    <input
                        id="isPrivate"
                        type="checkbox"
                        disabled={isLoading}
                        {...register("isPrivate")}
                        className="w-4 h-4 rounded cursor-pointer"
                    />
                    <Label htmlFor="isPrivate" className="cursor-pointer text-sm">
                        Make this photo private
                    </Label>
                </div>
            </div>

            {/* Submit Button */}
            <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
            >
                {isLoading ? "Uploading..." : "Upload Photo"}
            </Button>
        </form>
    );
};

export default PhotoUploadModal;
