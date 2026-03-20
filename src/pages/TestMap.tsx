import { useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";

type Position = {
  lat: number;
  lng: number;
};

function ClickMarker({
  position,
  setPosition,
}: {
  position: Position;
  setPosition: React.Dispatch<React.SetStateAction<Position>>;
}) {
  useMapEvents({
    click(e) {
      setPosition({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });

  return (
    <Marker position={[position.lat, position.lng]}>
      <Popup>
        ละติจูด: {position.lat.toFixed(6)}
        <br />
        ลองจิจูด: {position.lng.toFixed(6)}
      </Popup>
    </Marker>
  );
}

export default function TestMap() {
  const [position, setPosition] = useState<Position>({
    lat: 13.7563,
    lng: 100.5018,
  });

  return (
    <div className="min-h-screen bg-[#f5f6f8] p-6">
      <div className="rounded-[28px] bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-extrabold text-gray-900">
          ทดสอบแผนที่
        </h1>

        <div className="mb-4 rounded-2xl bg-[#f8f8fb] p-4 text-sm text-gray-700">
          <div className="font-semibold text-gray-900">ตำแหน่งที่เลือก</div>
          <div className="mt-2">Latitude: {position.lat}</div>
          <div>Longitude: {position.lng}</div>
          <div className="mt-2 text-pink-600">ลองคลิกบนแผนที่เพื่อย้ายหมุด</div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200">
          <MapContainer
            center={[position.lat, position.lng]}
            zoom={15}
            style={{ height: "500px", width: "100%" }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickMarker position={position} setPosition={setPosition} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}