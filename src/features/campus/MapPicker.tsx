'use client'

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
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

function ResizeFix() {
    const map = useMap();
    useEffect(() => { setTimeout(() => map.invalidateSize(), 0);}, [map]);
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
        <div className='relative z-0 h-[250px] w-full rounded-lg overflow-hidden mb-0'>
            <MapContainer
              center={[lat, lng]}
              zoom={15}
              scrollWheelZoom
              className='h-full w-full'
            >
              <ResizeFix></ResizeFix>
              
              
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