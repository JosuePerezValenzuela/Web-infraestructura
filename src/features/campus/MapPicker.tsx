'use client'

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { markerIcon } from './markerIcon';


type Props = {
    lat: number;
    lng: number;
    onChange: (pos: { lat:number; lng: number}) => void;
};

function ClickHandler({ onChange }: { onChange: Props['onChange'] }){
    // Hook que registrara eventos en el mapa
    useMapEvents({
        click (e){
            onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
}

export default function MapPicker({ lat, lng, onChange }: Props) {
    const Recenter = () => {
        const map = useMapEvents({
        });
        useEffect(() => {
            map.setView([lat, lng]);
        }, [lat, lng, map]);
        return null;
    };

    return (
        <div style={{ height: 360, width: '100%' }}>
            <MapContainer
              center={[lat, lng]}
              zoom={15}
              scrollWheelZoom
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              />

              <Marker
                position={[lat, lng]}
                icon={markerIcon}
              />

              <ClickHandler
                onChange={onChange}
              />

              <Recenter />
            </MapContainer>
        </div>
    );
}