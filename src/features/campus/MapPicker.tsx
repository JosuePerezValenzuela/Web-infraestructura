'use client'

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { markerIcon } from './markerIcon';

const DEFAULT_CENTER: [number, number] = [-17.3939, -66.1570];

export default function MapPicker() {
    return (
        <div style={{ height: 360, width: '100%' }}>
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={14}
              scrollWheelZoom
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url = "https://{s}.tile.openstreetmap.org/14/-17.3939/-66.1570.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              />

              <Marker
                position={DEFAULT_CENTER}
                icon={markerIcon}
              />
            </MapContainer>
        </div>
    );
}